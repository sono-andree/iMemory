import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

async function getRulesContext(userId: string) {
  const since30 = daysAgo(30);
  const today = getToday();

  const { data: reviews } = await supabaseAdmin
    .from("ai_daily_reviews")
    .select("*")
    .eq("user_id", userId)
    .gte("review_date", since30.slice(0, 10))
    .order("review_date", { ascending: false })
    .limit(12);

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

  const { data: weeklyStrategies } = await supabaseAdmin
    .from("ai_weekly_strategies")
    .select("*")
    .eq("user_id", userId)
    .order("week_start", { ascending: false })
    .limit(4);

  const { data: priorityRebalances } = await supabaseAdmin
    .from("ai_priority_rebalances")
    .select("*")
    .eq("user_id", userId)
    .gte("rebalance_date", since30.slice(0, 10))
    .order("rebalance_date", { ascending: false })
    .limit(10);

  const { data: actions } = await supabaseAdmin
    .from("ai_actions")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", since30)
    .order("id", { ascending: false })
    .limit(80);

  const { data: sessions } = await supabaseAdmin
    .from("ai_action_sessions")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", since30)
    .order("id", { ascending: false })
    .limit(50);

  const { data: checkins } = await supabaseAdmin
    .from("daily_checkins")
    .select("*")
    .eq("user_id", userId)
    .gte("checkin_date", since30.slice(0, 10))
    .order("checkin_date", { ascending: false })
    .limit(12);

  const { data: currentRules } = await supabaseAdmin
    .from("ai_operating_rules")
    .select("*")
    .eq("user_id", userId)
    .lt("rule_date", today)
    .order("rule_date", { ascending: false })
    .limit(3);

  return {
    today,
    reviews: reviews || [],
    patterns: patterns || [],
    interventions: interventions || [],
    weeklyStrategies: weeklyStrategies || [],
    priorityRebalances: priorityRebalances || [],
    actions: actions || [],
    sessions: sessions || [],
    checkins: checkins || [],
    currentRules: currentRules || [],
  };
}

function fallbackRules(context: any) {
  const actions = context.actions || [];
  const sessions = context.sessions || [];

  const completed = actions.filter((item: any) => item.status === "completed");
  const open = actions.filter((item: any) => item.status !== "completed");

  const completionRate =
    actions.length === 0
      ? 0
      : Math.round((completed.length / actions.length) * 100);

  return {
    title: "Personal Operating Rules",
    summary:
      "iMemory ha creato un set di regole operative personali basate su azioni, sessioni e pattern recenti.",
    primary_rule:
      "Lavora su una sola azione alla volta fino a produrre un output visibile.",
    focus_rule:
      sessions.length > 0
        ? "Usa sessioni brevi con AI Coach e salva sempre una nota finale."
        : "Avvia una sessione breve prima di aggiungere nuove attività.",
    planning_rule:
      "Non rigenerare il piano finché non hai completato almeno un blocco operativo.",
    priority_rule:
      open.length > 3
        ? "Quando ci sono troppe azioni aperte, abbassa quelle meno urgenti e chiudi una micro-task."
        : "Mantieni la queue corta e parti dalla task con impatto più alto.",
    rescue_rule:
      "Se perdi focus, non cambiare progetto: apri Rescue Mode e fai una micro-azione da 5 minuti.",
    anti_failure_rule:
      "Evita di aprire nuove task prima di aver chiuso o salvato progresso su quella selezionata.",
    confidence_score: Math.max(55, Math.min(85, completionRate || 65)),
    rules: [
      "Una sola missione per sessione.",
      "Prima output, poi ottimizzazione.",
      "Ogni sessione deve finire con una nota.",
      "Se il blocco dura più di 5 minuti, riduci la task.",
    ],
    triggers: [
      "Troppe azioni aperte",
      "Bassa completion rate",
      "Sessione senza nota finale",
    ],
    evidence: [
      `Azioni analizzate: ${actions.length}`,
      `Azioni completate: ${completed.length}`,
      `Sessioni analizzate: ${sessions.length}`,
    ],
  };
}

async function generateRules(context: any) {
  if (!openai) return fallbackRules(context);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: `
Sei l'AI Operating Rules Engine di iMemory.

Devi trasformare comportamento, review, pattern, interventi, priority rebalance e weekly strategy in regole operative personali.

Rispondi SOLO in JSON valido:
{
  "title": "titolo breve",
  "summary": "sintesi",
  "primary_rule": "regola principale",
  "focus_rule": "regola focus",
  "planning_rule": "regola pianificazione",
  "priority_rule": "regola priorità",
  "rescue_rule": "regola salvataggio",
  "anti_failure_rule": "regola anti-fallimento",
  "confidence_score": 1-100,
  "rules": ["regola 1", "regola 2", "regola 3", "regola 4"],
  "triggers": ["trigger 1", "trigger 2", "trigger 3"],
  "evidence": ["evidenza 1", "evidenza 2", "evidenza 3"]
}

Regole:
- italiano
- concreto
- massimo 4 rules
- massimo 3 triggers
- massimo 3 evidence
- niente motivazione generica
- ogni regola deve essere utilizzabile da Autopilot
- devi imparare dai dati, non ripetere frasi ovvie
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

    const fallback = fallbackRules(context);

    return {
      title:
        cleanText(parsed.title).slice(0, 120) || "Personal Operating Rules",
      summary:
        cleanText(parsed.summary) ||
        "iMemory ha aggiornato le tue regole operative.",
      primary_rule:
        cleanText(parsed.primary_rule) || fallback.primary_rule,
      focus_rule:
        cleanText(parsed.focus_rule) || fallback.focus_rule,
      planning_rule:
        cleanText(parsed.planning_rule) || fallback.planning_rule,
      priority_rule:
        cleanText(parsed.priority_rule) || fallback.priority_rule,
      rescue_rule:
        cleanText(parsed.rescue_rule) || fallback.rescue_rule,
      anti_failure_rule:
        cleanText(parsed.anti_failure_rule) || fallback.anti_failure_rule,
      confidence_score: clampScore(parsed.confidence_score),
      rules: Array.isArray(parsed.rules)
        ? parsed.rules.slice(0, 4).map((item: any) => cleanText(item))
        : fallback.rules,
      triggers: Array.isArray(parsed.triggers)
        ? parsed.triggers.slice(0, 3).map((item: any) => cleanText(item))
        : fallback.triggers,
      evidence: Array.isArray(parsed.evidence)
        ? parsed.evidence.slice(0, 3).map((item: any) => cleanText(item))
        : fallback.evidence,
    };
  } catch (error) {
    console.log("AI OPERATING RULES ERROR:", error);
    return fallbackRules(context);
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
    const today = getToday();

    if (!force) {
      const { data: existing } = await supabaseAdmin
        .from("ai_operating_rules")
        .select("*")
        .eq("user_id", user.id)
        .eq("rule_date", today)
        .maybeSingle();

      if (existing) {
        return Response.json({
          operatingRules: existing,
          source: "existing",
        });
      }
    }

    const context = await getRulesContext(user.id);
    const ai = await generateRules(context);

    const { data: operatingRules, error } = await supabaseAdmin
      .from("ai_operating_rules")
      .upsert(
        {
          user_id: user.id,
          rule_date: today,
          title: ai.title,
          summary: ai.summary,
          primary_rule: ai.primary_rule,
          focus_rule: ai.focus_rule,
          planning_rule: ai.planning_rule,
          priority_rule: ai.priority_rule,
          rescue_rule: ai.rescue_rule,
          anti_failure_rule: ai.anti_failure_rule,
          confidence_score: ai.confidence_score,
          rules: ai.rules,
          triggers: ai.triggers,
          evidence: ai.evidence,
          active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,rule_date",
        }
      )
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      operatingRules,
      source: "generated",
    });
  } catch (error: any) {
    console.log("AI OPERATING RULES GET ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore Operating Rules",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return Response.json({ error: "Utente non autorizzato" }, { status: 401 });
    }

    const body = await req.json();
    const ruleId = Number(body.ruleId);
    const active = Boolean(body.active);

    if (!ruleId) {
      return Response.json({ error: "Rule ID mancante" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("ai_operating_rules")
      .update({
        active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      operatingRules: data,
    });
  } catch (error: any) {
    console.log("AI OPERATING RULES PATCH ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore aggiornamento Operating Rules",
      },
      { status: 500 }
    );
  }
}