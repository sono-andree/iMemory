import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay();

  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    weekStart: toDateString(monday),
    weekEnd: toDateString(sunday),
    weekStartISO: monday.toISOString(),
    weekEndISO: sunday.toISOString(),
  };
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function cleanText(value: any) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clampScore(value: any) {
  const n = Number(value || 70);
  if (Number.isNaN(n)) return 70;
  return Math.max(1, Math.min(100, Math.round(n)));
}

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;

  return user;
}

async function getWeeklyContext(userId: string) {
  const { weekStart, weekEnd, weekStartISO, weekEndISO } =
    getCurrentWeekRange();

  const since30 = daysAgo(30);

  const { data: reviews } = await supabaseAdmin
    .from("ai_daily_reviews")
    .select("*")
    .eq("user_id", userId)
    .gte("review_date", since30.slice(0, 10))
    .order("review_date", { ascending: false })
    .limit(10);

  const { data: patterns } = await supabaseAdmin
    .from("ai_brain_patterns")
    .select("*")
    .eq("user_id", userId)
    .gte("pattern_date", since30.slice(0, 10))
    .order("pattern_date", { ascending: false })
    .limit(10);

  const { data: interventions } = await supabaseAdmin
    .from("ai_interventions")
    .select("*")
    .eq("user_id", userId)
    .gte("intervention_date", since30.slice(0, 10))
    .order("intervention_date", { ascending: false })
    .limit(10);

  const { data: plans } = await supabaseAdmin
    .from("ai_daily_plans")
    .select("*")
    .eq("user_id", userId)
    .gte("plan_date", since30.slice(0, 10))
    .order("plan_date", { ascending: false })
    .limit(10);

  const { data: actions } = await supabaseAdmin
    .from("ai_actions")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", weekStartISO)
    .lte("created_at", weekEndISO)
    .order("impact_score", { ascending: false })
    .limit(60);

  const { data: sessions } = await supabaseAdmin
    .from("ai_action_sessions")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", weekStartISO)
    .lte("created_at", weekEndISO)
    .order("id", { ascending: false })
    .limit(40);

  const { data: checkins } = await supabaseAdmin
    .from("daily_checkins")
    .select("*")
    .eq("user_id", userId)
    .gte("checkin_date", since30.slice(0, 10))
    .order("checkin_date", { ascending: false })
    .limit(10);

  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "Completato")
    .order("priority", { ascending: false })
    .limit(8);

  return {
    weekStart,
    weekEnd,
    reviews: reviews || [],
    patterns: patterns || [],
    interventions: interventions || [],
    plans: plans || [],
    actions: actions || [],
    sessions: sessions || [],
    checkins: checkins || [],
    goals: goals || [],
  };
}

function fallbackStrategy(context: any) {
  const actions = context.actions || [];
  const completed = actions.filter((item: any) => item.status === "completed");
  const openHighImpact = actions.filter(
    (item: any) =>
      item.status !== "completed" &&
      (item.priority === "high" || Number(item.impact_score || 0) >= 80)
  );

  const completionRate =
    actions.length === 0
      ? 0
      : Math.round((completed.length / actions.length) * 100);

  return {
    title: "Weekly Strategy",
    summary:
      "iMemory ha creato una strategia settimanale basata su azioni, review e pattern recenti.",
    weekly_goal:
      openHighImpact[0]?.title ||
      "Chiudere almeno una azione ad alto impatto e ridurre le attività aperte.",
    priority_focus:
      "Completamento visibile: meno task aperti, più output conclusi.",
    operating_rule:
      "Ogni giorno: una azione principale, una sessione breve, una nota finale.",
    risk_to_avoid:
      "Aprire nuove attività prima di completare quelle già selezionate.",
    success_definition:
      "La settimana è riuscita se almeno 3 azioni importanti vengono completate con note di esecuzione.",
    confidence_score: Math.max(55, Math.min(85, completionRate || 65)),
    success_metrics: [
      "Almeno 3 azioni completate",
      "Almeno 3 sessioni AI Coach salvate",
      "Daily Review completata almeno 3 volte",
    ],
    weekly_plan: [
      {
        day: "Lunedì",
        focus: "Seleziona la prima azione ad alto impatto",
        output: "Una micro-versione completata",
      },
      {
        day: "Martedì",
        focus: "Continua solo sulla task più importante",
        output: "Secondo output visibile",
      },
      {
        day: "Mercoledì",
        focus: "Review dei blocchi",
        output: "Correzione strategia",
      },
      {
        day: "Giovedì",
        focus: "Esecuzione concentrata",
        output: "Azione completata",
      },
      {
        day: "Venerdì",
        focus: "Chiusura e pulizia queue",
        output: "Settimana consolidata",
      },
    ],
    key_actions: openHighImpact.slice(0, 3).map((item: any) => ({
      id: item.id,
      title: item.title,
      reason: item.ai_reason || "Azione ad alto impatto ancora aperta.",
    })),
    anti_failure_rules: [
      "Non rigenerare il piano se non hai chiuso almeno un blocco.",
      "Non cambiare task mentre il timer è attivo.",
      "Se perdi focus, torna alla prima azione incompleta.",
    ],
  };
}

async function generateStrategy(context: any) {
  if (!openai) return fallbackStrategy(context);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.45,
      messages: [
        {
          role: "system",
          content: `
Sei l'AI Weekly Strategy Engine di iMemory.

Devi creare una strategia settimanale concreta usando:
- daily reviews
- predictive brain patterns
- interventions
- autopilot plans
- actions
- sessions
- check-in
- goals

Rispondi SOLO in JSON valido:
{
  "title": "titolo breve",
  "summary": "sintesi strategica",
  "weekly_goal": "obiettivo principale della settimana",
  "priority_focus": "focus prioritario",
  "operating_rule": "regola operativa della settimana",
  "risk_to_avoid": "rischio da evitare",
  "success_definition": "come capire se la settimana è riuscita",
  "confidence_score": 1-100,
  "success_metrics": ["metrica 1", "metrica 2", "metrica 3"],
  "weekly_plan": [
    {
      "day": "Lunedì",
      "focus": "focus del giorno",
      "output": "output concreto"
    }
  ],
  "key_actions": [
    {
      "id": 123,
      "title": "azione",
      "reason": "perché è importante"
    }
  ],
  "anti_failure_rules": ["regola 1", "regola 2", "regola 3"]
}

Regole:
- italiano
- concreto
- massimo 5 giorni nel weekly_plan
- massimo 3 key_actions
- massimo 3 success_metrics
- massimo 3 anti_failure_rules
- se usi una action, usa il suo id reale
- niente motivazione generica
          `,
        },
        {
          role: "user",
          content: `
Dati disponibili:
${JSON.stringify(context, null, 2)}
          `,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "";

    let parsed: any;

    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("JSON non trovato");
      parsed = JSON.parse(match[0]);
    }

    return {
      title: cleanText(parsed.title).slice(0, 120) || "Weekly Strategy",
      summary:
        cleanText(parsed.summary) ||
        "iMemory ha creato una strategia settimanale.",
      weekly_goal:
        cleanText(parsed.weekly_goal) ||
        "Completare una azione ad alto impatto.",
      priority_focus:
        cleanText(parsed.priority_focus) ||
        "Completamento e riduzione delle azioni aperte.",
      operating_rule:
        cleanText(parsed.operating_rule) ||
        "Una azione principale al giorno, una sessione, una review.",
      risk_to_avoid:
        cleanText(parsed.risk_to_avoid) ||
        "Saltare da una task all'altra senza chiudere nulla.",
      success_definition:
        cleanText(parsed.success_definition) ||
        "Settimana riuscita se vengono completate almeno 3 azioni importanti.",
      confidence_score: clampScore(parsed.confidence_score),
      success_metrics: Array.isArray(parsed.success_metrics)
        ? parsed.success_metrics.slice(0, 3).map((item: any) => cleanText(item))
        : fallbackStrategy(context).success_metrics,
      weekly_plan: Array.isArray(parsed.weekly_plan)
        ? parsed.weekly_plan.slice(0, 5).map((item: any) => ({
            day: cleanText(item.day) || "Giorno",
            focus: cleanText(item.focus) || "Focus operativo",
            output: cleanText(item.output) || "Output concreto",
          }))
        : fallbackStrategy(context).weekly_plan,
      key_actions: Array.isArray(parsed.key_actions)
        ? parsed.key_actions.slice(0, 3).map((item: any) => ({
            id: item.id ? Number(item.id) : null,
            title: cleanText(item.title),
            reason: cleanText(item.reason),
          }))
        : fallbackStrategy(context).key_actions,
      anti_failure_rules: Array.isArray(parsed.anti_failure_rules)
        ? parsed.anti_failure_rules
            .slice(0, 3)
            .map((item: any) => cleanText(item))
        : fallbackStrategy(context).anti_failure_rules,
    };
  } catch (error) {
    console.log("AI WEEKLY STRATEGY ERROR:", error);
    return fallbackStrategy(context);
  }
}

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return Response.json({ error: "Utente non autorizzato" }, { status: 401 });
    }

    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";

    const { weekStart, weekEnd } = getCurrentWeekRange();

    if (!force) {
      const { data: existing } = await supabaseAdmin
        .from("ai_weekly_strategies")
        .select("*")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (existing) {
        return Response.json({
          strategy: existing,
          source: "existing",
        });
      }
    }

    const context = await getWeeklyContext(user.id);
    const ai = await generateStrategy(context);

    const { data: strategy, error } = await supabaseAdmin
      .from("ai_weekly_strategies")
      .upsert(
        {
          user_id: user.id,
          week_start: weekStart,
          week_end: weekEnd,
          title: ai.title,
          summary: ai.summary,
          weekly_goal: ai.weekly_goal,
          priority_focus: ai.priority_focus,
          operating_rule: ai.operating_rule,
          risk_to_avoid: ai.risk_to_avoid,
          success_definition: ai.success_definition,
          confidence_score: ai.confidence_score,
          success_metrics: ai.success_metrics,
          weekly_plan: ai.weekly_plan,
          key_actions: ai.key_actions,
          anti_failure_rules: ai.anti_failure_rules,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,week_start",
        }
      )
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      strategy,
      source: "generated",
    });
  } catch (error: any) {
    console.log("AI WEEKLY STRATEGY GET ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore Weekly Strategy",
      },
      { status: 500 }
    );
  }
}