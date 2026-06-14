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

async function getLatestSingle(userId: string, table: string, dateColumn: string) {
  const { data } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .order(dateColumn, { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
}

async function getOrchestratorContext(userId: string, today: string) {
  const { data: actions } = await supabaseAdmin
    .from("ai_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("action_date", today)
    .order("impact_score", { ascending: false });

  const { data: sessions } = await supabaseAdmin
    .from("ai_action_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(10);

  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select("id, title, description, status, priority, ai_strategy, ai_risk, ai_next_action")
    .eq("user_id", userId)
    .neq("status", "Completato")
    .order("id", { ascending: false })
    .limit(8);

  const { data: memories } = await supabaseAdmin
    .from("memories")
    .select("id, title, category, summary, created_at")
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(8);

  const dailyPlan = await getLatestSingle(
    userId,
    "ai_daily_plans",
    "plan_date"
  );

  const dailyReview = await getLatestSingle(
    userId,
    "ai_daily_reviews",
    "review_date"
  );

  const predictiveBrain = await getLatestSingle(
    userId,
    "ai_brain_patterns",
    "pattern_date"
  );

  const intervention = await getLatestSingle(
    userId,
    "ai_interventions",
    "intervention_date"
  );

  const weeklyStrategy = await getLatestSingle(
    userId,
    "ai_weekly_strategies",
    "week_start"
  );

  const priorityRebalance = await getLatestSingle(
    userId,
    "ai_priority_rebalances",
    "rebalance_date"
  );

  const operatingRules = await getLatestSingle(
    userId,
    "ai_operating_rules",
    "rule_date"
  );

  const moduleStatus = [
    {
      key: "autopilot",
      label: "Daily Autopilot",
      exists: Boolean(dailyPlan),
      date: dailyPlan?.plan_date || null,
    },
    {
      key: "daily_review",
      label: "Daily Review",
      exists: Boolean(dailyReview),
      date: dailyReview?.review_date || null,
      closed: Boolean(dailyReview?.closed),
    },
    {
      key: "predictive_brain",
      label: "Predictive Brain",
      exists: Boolean(predictiveBrain),
      date: predictiveBrain?.pattern_date || null,
    },
    {
      key: "intervention",
      label: "AI Intervention",
      exists: Boolean(intervention),
      date: intervention?.intervention_date || null,
      status: intervention?.status || null,
    },
    {
      key: "weekly_strategy",
      label: "Weekly Strategy",
      exists: Boolean(weeklyStrategy),
      date: weeklyStrategy?.week_start || null,
    },
    {
      key: "priority_rebalance",
      label: "Priority Rebalance",
      exists: Boolean(priorityRebalance),
      date: priorityRebalance?.rebalance_date || null,
      applied: Boolean(priorityRebalance?.applied),
    },
    {
      key: "operating_rules",
      label: "Operating Rules",
      exists: Boolean(operatingRules),
      date: operatingRules?.rule_date || null,
      active: Boolean(operatingRules?.active),
    },
  ];

  return {
    today,
    actions: actions || [],
    sessions: sessions || [],
    goals: goals || [],
    memories: memories || [],
    modules: moduleStatus,
    dailyPlan,
    dailyReview,
    predictiveBrain,
    intervention,
    weeklyStrategy,
    priorityRebalance,
    operatingRules,
  };
}

function fallbackOrchestration(context: any) {
  const modules = context.modules || [];
  const actions = context.actions || [];

  const missingModules = modules
    .filter((item: any) => !item.exists)
    .map((item: any) => item.label);

  const staleModules = modules
    .filter((item: any) => item.exists && item.date && item.date < context.today)
    .map((item: any) => item.label);

  const activeModules = modules
    .filter((item: any) => item.exists)
    .map((item: any) => item.label);

  const openActions = actions.filter((item: any) => item.status !== "completed");
  const completedActions = actions.filter(
    (item: any) => item.status === "completed"
  );

  const topAction =
    openActions.find(
      (item: any) =>
        item.priority === "high" || Number(item.impact_score || 0) >= 80
    ) ||
    openActions[0] ||
    null;

  const healthBase = 100 - missingModules.length * 8 - staleModules.length * 5;
  const healthWithActions =
    actions.length === 0
      ? healthBase - 10
      : healthBase + Math.min(10, completedActions.length * 3);

  return {
    title: "Brain Orchestrator",
    summary:
      "iMemory ha analizzato lo stato dei moduli AI e ha deciso la prossima mossa operativa.",
    brain_health_score: Math.max(35, Math.min(95, healthWithActions)),
    system_status:
      missingModules.length >= 3
        ? "needs_setup"
        : staleModules.length >= 3
        ? "needs_refresh"
        : "stable",
    executive_decision:
      topAction?.title ||
      "Genera o aggiorna Autopilot, poi seleziona una singola azione da completare.",
    next_best_action_id: topAction?.id || null,
    next_best_move:
      topAction?.title ||
      "Aggiorna i moduli mancanti e crea la prima azione operativa.",
    missing_modules: missingModules,
    stale_modules: staleModules,
    active_modules: activeModules,
    recommended_refresh_order:
      missingModules.length > 0
        ? missingModules
        : staleModules.length > 0
        ? staleModules
        : ["Priority Rebalance", "Autopilot", "Daily Review"],
    risks: [
      openActions.length > 4
        ? "Troppe azioni aperte possono ridurre il completamento."
        : "La queue è gestibile.",
      missingModules.length > 0
        ? "Alcuni moduli AI non hanno ancora dati."
        : "I moduli principali sono disponibili.",
    ],
    opportunities: [
      "Usa Priority Rebalance per scegliere cosa fare prima.",
      "Chiudi la giornata con Daily Review per migliorare il piano successivo.",
    ],
  };
}

async function generateOrchestration(context: any) {
  if (!openai) return fallbackOrchestration(context);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: `
Sei l'AI Brain Orchestrator di iMemory.

Devi leggere lo stato completo del sistema AI e decidere:
- quali moduli sono attivi
- quali moduli mancano
- quali moduli sono vecchi
- qual è il rischio principale
- qual è la prossima mossa migliore
- quale azione conviene eseguire adesso

Rispondi SOLO in JSON valido:
{
  "title": "titolo breve",
  "summary": "sintesi dello stato AI",
  "brain_health_score": 1-100,
  "system_status": "stable | needs_refresh | needs_setup | critical",
  "executive_decision": "decisione centrale",
  "next_best_action_id": 123,
  "next_best_move": "prossima mossa concreta",
  "missing_modules": ["modulo mancante"],
  "stale_modules": ["modulo vecchio"],
  "active_modules": ["modulo attivo"],
  "recommended_refresh_order": ["modulo 1", "modulo 2"],
  "risks": ["rischio 1", "rischio 2"],
  "opportunities": ["opportunità 1", "opportunità 2"]
}

Regole:
- italiano
- massimo 4 elementi per array
- usa solo next_best_action_id reali presenti nelle actions
- non inventare moduli
- se tutto è stabile, suggerisci esecuzione, non altra generazione
- devi comportarti come un coordinatore centrale del sistema
          `,
        },
        {
          role: "user",
          content: `
Stato completo di iMemory:
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

    const fallback = fallbackOrchestration(context);
    const existingActionIds = new Set(
      (context.actions || []).map((item: any) => Number(item.id))
    );

    const actionId = Number(parsed.next_best_action_id || 0);

    return {
      title: cleanText(parsed.title).slice(0, 120) || "Brain Orchestrator",
      summary:
        cleanText(parsed.summary) ||
        "iMemory ha analizzato lo stato del cervello AI.",
      brain_health_score: clampScore(parsed.brain_health_score),
      system_status:
        parsed.system_status === "needs_refresh" ||
        parsed.system_status === "needs_setup" ||
        parsed.system_status === "critical" ||
        parsed.system_status === "stable"
          ? parsed.system_status
          : fallback.system_status,
      executive_decision:
        cleanText(parsed.executive_decision) || fallback.executive_decision,
      next_best_action_id: existingActionIds.has(actionId)
        ? actionId
        : fallback.next_best_action_id,
      next_best_move: cleanText(parsed.next_best_move) || fallback.next_best_move,
      missing_modules: Array.isArray(parsed.missing_modules)
        ? parsed.missing_modules.slice(0, 4).map((item: any) => cleanText(item))
        : fallback.missing_modules,
      stale_modules: Array.isArray(parsed.stale_modules)
        ? parsed.stale_modules.slice(0, 4).map((item: any) => cleanText(item))
        : fallback.stale_modules,
      active_modules: Array.isArray(parsed.active_modules)
        ? parsed.active_modules.slice(0, 4).map((item: any) => cleanText(item))
        : fallback.active_modules,
      recommended_refresh_order: Array.isArray(parsed.recommended_refresh_order)
        ? parsed.recommended_refresh_order
            .slice(0, 4)
            .map((item: any) => cleanText(item))
        : fallback.recommended_refresh_order,
      risks: Array.isArray(parsed.risks)
        ? parsed.risks.slice(0, 4).map((item: any) => cleanText(item))
        : fallback.risks,
      opportunities: Array.isArray(parsed.opportunities)
        ? parsed.opportunities.slice(0, 4).map((item: any) => cleanText(item))
        : fallback.opportunities,
    };
  } catch (error) {
    console.log("AI BRAIN ORCHESTRATOR ERROR:", error);
    return fallbackOrchestration(context);
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
        .from("ai_brain_orchestrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("orchestration_date", today)
        .maybeSingle();

      if (existing) {
        return Response.json({
          orchestration: existing,
          source: "existing",
        });
      }
    }

    const context = await getOrchestratorContext(user.id, today);
    const ai = await generateOrchestration(context);

    const { data: orchestration, error } = await supabaseAdmin
      .from("ai_brain_orchestrations")
      .upsert(
        {
          user_id: user.id,
          orchestration_date: today,
          title: ai.title,
          summary: ai.summary,
          brain_health_score: ai.brain_health_score,
          system_status: ai.system_status,
          executive_decision: ai.executive_decision,
          next_best_action_id: ai.next_best_action_id,
          next_best_move: ai.next_best_move,
          missing_modules: ai.missing_modules,
          stale_modules: ai.stale_modules,
          active_modules: ai.active_modules,
          recommended_refresh_order: ai.recommended_refresh_order,
          risks: ai.risks,
          opportunities: ai.opportunities,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,orchestration_date",
        }
      )
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      orchestration,
      source: "generated",
    });
  } catch (error: any) {
    console.log("AI BRAIN ORCHESTRATOR GET ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore Brain Orchestrator",
      },
      { status: 500 }
    );
  }
}