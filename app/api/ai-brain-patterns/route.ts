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
  const score = Number(value || 70);
  if (Number.isNaN(score)) return 70;
  return Math.max(1, Math.min(100, Math.round(score)));
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

async function getPatternContext(userId: string) {
  const since14 = daysAgo(14);
  const since30 = daysAgo(30);

  const { data: reviews } = await supabaseAdmin
    .from("ai_daily_reviews")
    .select(
      "review_date, summary, completion_score, focus_score, momentum_score, what_worked, blockers, lessons, suggested_next_actions, tomorrow_strategy, user_reflection, closed"
    )
    .eq("user_id", userId)
    .gte("review_date", since30.slice(0, 10))
    .order("review_date", { ascending: false })
    .limit(14);

  const { data: plans } = await supabaseAdmin
    .from("ai_daily_plans")
    .select(
      "plan_date, title, overview, energy_mode, main_objective, estimated_total_minutes, success_criteria, time_blocks, anti_block_protocol, recovery_plan"
    )
    .eq("user_id", userId)
    .gte("plan_date", since14.slice(0, 10))
    .order("plan_date", { ascending: false })
    .limit(10);

  const { data: actions } = await supabaseAdmin
    .from("ai_actions")
    .select(
      "id, action_date, title, description, priority, effort, impact_score, source_type, ai_reason, status, completed_at, created_at"
    )
    .eq("user_id", userId)
    .gte("created_at", since14)
    .order("id", { ascending: false })
    .limit(50);

  const { data: sessions } = await supabaseAdmin
    .from("ai_action_sessions")
    .select(
      "id, action_id, duration_seconds, note, ai_reflection, completed, created_at"
    )
    .eq("user_id", userId)
    .gte("created_at", since14)
    .order("id", { ascending: false })
    .limit(40);

  const { data: checkins } = await supabaseAdmin
    .from("daily_checkins")
    .select(
      "checkin_date, mood, energy, main_focus, blocker, note, ai_reflection"
    )
    .eq("user_id", userId)
    .gte("checkin_date", since30.slice(0, 10))
    .order("checkin_date", { ascending: false })
    .limit(14);

  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select(
      "id, title, description, status, priority, deadline, ai_strategy, ai_risk, ai_next_action"
    )
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(8);

  return {
    reviews: reviews || [],
    plans: plans || [],
    actions: actions || [],
    sessions: sessions || [],
    checkins: checkins || [],
    goals: goals || [],
  };
}

function fallbackPatterns(context: any) {
  const actions = context.actions || [];
  const completed = actions.filter((a: any) => a.status === "completed");
  const completionRate =
    actions.length === 0 ? 0 : Math.round((completed.length / actions.length) * 100);

  const blockers = (context.reviews || [])
    .flatMap((r: any) => r.blockers || [])
    .filter(Boolean);

  const commonBlocker = blockers[0] || "Il rischio principale è accumulare azioni senza chiuderle.";

  return {
    title: "Predictive Brain",
    summary:
      "iMemory ha analizzato le ultime attività e ha identificato pattern operativi utili per migliorare la prossima sessione.",
    strongest_pattern:
      completionRate >= 60
        ? "Quando lavori su azioni brevi e guidate, il completamento aumenta."
        : "Le azioni restano più spesso aperte quando non vengono trasformate in micro-step immediati.",
    recurring_blocker: commonBlocker,
    best_work_mode:
      "Sessioni brevi da 15-25 minuti con una singola azione selezionata.",
    predicted_risk:
      "Il rischio più probabile è iniziare troppe attività senza chiudere la prima.",
    next_best_strategy:
      "Apri l'AI Coach, scegli una sola azione ad alto impatto e completa un output visibile prima di cambiare task.",
    confidence_score: Math.max(55, Math.min(85, completionRate || 65)),
    signals: [
      `Azioni analizzate: ${actions.length}`,
      `Azioni completate: ${completed.length}`,
      `Review disponibili: ${(context.reviews || []).length}`,
    ],
    recommendations: [
      "Parti dalla prima azione incompleta ad alto impatto.",
      "Usa timer breve e salva sempre una nota finale.",
      "Rigenera Autopilot solo dopo aver chiuso almeno un blocco.",
    ],
    warnings: [
      "Non aggiungere nuove azioni se la queue è già piena.",
      "Non saltare la Daily Review: serve a migliorare il piano successivo.",
    ],
  };
}

async function generatePatterns(context: any) {
  if (!openai) return fallbackPatterns(context);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.45,
      messages: [
        {
          role: "system",
          content: `
Sei il Predictive Brain Engine di iMemory.

Devi analizzare il comportamento dell'utente negli ultimi giorni e trovare pattern reali:
- cosa funziona
- cosa blocca
- quali rischi sono prevedibili
- quale strategia conviene usare adesso

Rispondi SOLO in JSON valido:
{
  "title": "titolo breve",
  "summary": "sintesi intelligente",
  "strongest_pattern": "pattern più importante",
  "recurring_blocker": "blocco ricorrente",
  "best_work_mode": "modalità di lavoro migliore",
  "predicted_risk": "rischio previsto",
  "next_best_strategy": "strategia consigliata",
  "confidence_score": 1-100,
  "signals": ["segnale 1", "segnale 2", "segnale 3"],
  "recommendations": ["raccomandazione 1", "raccomandazione 2", "raccomandazione 3"],
  "warnings": ["warning 1", "warning 2"]
}

Regole:
- italiano
- concreto
- niente frasi motivazionali generiche
- massimo 3 signals
- massimo 3 recommendations
- massimo 2 warnings
- devi ragionare sui dati, non inventare troppo
          `,
        },
        {
          role: "user",
          content: `
Dati utente:
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
      title: cleanText(parsed.title).slice(0, 120) || "Predictive Brain",
      summary:
        cleanText(parsed.summary) ||
        "iMemory ha analizzato i pattern recenti.",
      strongest_pattern:
        cleanText(parsed.strongest_pattern) ||
        "I blocchi brevi aumentano la probabilità di completamento.",
      recurring_blocker:
        cleanText(parsed.recurring_blocker) ||
        "Il rischio principale è non chiudere le azioni iniziate.",
      best_work_mode:
        cleanText(parsed.best_work_mode) ||
        "Sessioni brevi con una sola azione alla volta.",
      predicted_risk:
        cleanText(parsed.predicted_risk) ||
        "Probabile perdita di focus se vengono aperte troppe attività.",
      next_best_strategy:
        cleanText(parsed.next_best_strategy) ||
        "Completa una singola azione ad alto impatto con AI Coach.",
      confidence_score: clampScore(parsed.confidence_score),
      signals: Array.isArray(parsed.signals)
        ? parsed.signals.slice(0, 3).map((x: any) => cleanText(x))
        : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.slice(0, 3).map((x: any) => cleanText(x))
        : [],
      warnings: Array.isArray(parsed.warnings)
        ? parsed.warnings.slice(0, 2).map((x: any) => cleanText(x))
        : [],
    };
  } catch (error) {
    console.log("PREDICTIVE BRAIN ERROR:", error);
    return fallbackPatterns(context);
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
      const { data: existingPattern } = await supabaseAdmin
        .from("ai_brain_patterns")
        .select("*")
        .eq("user_id", user.id)
        .eq("pattern_date", today)
        .maybeSingle();

      if (existingPattern) {
        return Response.json({
          pattern: existingPattern,
          source: "existing",
        });
      }
    }

    const context = await getPatternContext(user.id);
    const ai = await generatePatterns(context);

    const { data: pattern, error } = await supabaseAdmin
      .from("ai_brain_patterns")
      .upsert(
        {
          user_id: user.id,
          pattern_date: today,
          title: ai.title,
          summary: ai.summary,
          strongest_pattern: ai.strongest_pattern,
          recurring_blocker: ai.recurring_blocker,
          best_work_mode: ai.best_work_mode,
          predicted_risk: ai.predicted_risk,
          next_best_strategy: ai.next_best_strategy,
          confidence_score: ai.confidence_score,
          signals: ai.signals,
          recommendations: ai.recommendations,
          warnings: ai.warnings,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,pattern_date",
        }
      )
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      pattern,
      source: "generated",
    });
  } catch (error: any) {
    console.log("AI BRAIN PATTERNS GET ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore Predictive Brain",
      },
      { status: 500 }
    );
  }
}