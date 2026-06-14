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

function clampPriority(value: any) {
  const priority = cleanText(value).toLowerCase();

  if (priority === "high") return "high";
  if (priority === "low") return "low";

  return "medium";
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

async function getRebalanceContext(userId: string, date: string) {
  const { data: actions } = await supabaseAdmin
    .from("ai_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("action_date", date)
    .order("impact_score", { ascending: false });

  const { data: weeklyStrategy } = await supabaseAdmin
    .from("ai_weekly_strategies")
    .select("*")
    .eq("user_id", userId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: pattern } = await supabaseAdmin
    .from("ai_brain_patterns")
    .select("*")
    .eq("user_id", userId)
    .order("pattern_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: intervention } = await supabaseAdmin
    .from("ai_interventions")
    .select("*")
    .eq("user_id", userId)
    .order("intervention_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: autopilot } = await supabaseAdmin
    .from("ai_daily_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_date", date)
    .maybeSingle();

  const { data: review } = await supabaseAdmin
    .from("ai_daily_reviews")
    .select("*")
    .eq("user_id", userId)
    .order("review_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select("id, title, description, status, priority, ai_strategy, ai_risk, ai_next_action")
    .eq("user_id", userId)
    .neq("status", "Completato")
    .order("id", { ascending: false })
    .limit(8);

  return {
    actions: actions || [],
    weeklyStrategy: weeklyStrategy || null,
    pattern: pattern || null,
    intervention: intervention || null,
    autopilot: autopilot || null,
    review: review || null,
    goals: goals || [],
  };
}

function fallbackRebalance(context: any) {
  const actions = context.actions || [];

  const openActions = actions.filter((item: any) => item.status !== "completed");

  const sorted = [...openActions].sort((a: any, b: any) => {
    const aScore =
      Number(a.impact_score || 0) +
      (a.priority === "high" ? 20 : a.priority === "medium" ? 10 : 0);

    const bScore =
      Number(b.impact_score || 0) +
      (b.priority === "high" ? 20 : b.priority === "medium" ? 10 : 0);

    return bScore - aScore;
  });

  const top = sorted[0] || null;
  const quickWin =
    sorted.find((item: any) =>
      String(item.effort || "").toLowerCase().includes("10")
    ) ||
    sorted.find((item: any) =>
      String(item.effort || "").toLowerCase().includes("15")
    ) ||
    top;

  return {
    title: "Priority Rebalance",
    summary:
      "iMemory ha riordinato le azioni in base a impatto, urgenza e segnali strategici.",
    top_action_id: top?.id || null,
    quick_win_action_id: quickWin?.id || null,
    confidence_score: 68,
    warning:
      openActions.length > 4
        ? "Hai molte azioni aperte: conviene chiuderne una prima di crearne altre."
        : "La queue è gestibile: esegui la prima azione consigliata.",
    recommended_order: sorted.slice(0, 5).map((action: any, index: number) => ({
      action_id: action.id,
      title: action.title,
      priority: index === 0 ? "high" : index <= 2 ? "medium" : "low",
      impact_score: Math.max(55, Math.min(100, Number(action.impact_score || 70) + (index === 0 ? 10 : 0))),
      mode: index === 0 ? "do_now" : index <= 2 ? "next" : "later",
      reason:
        index === 0
          ? "È la migliore azione da eseguire ora."
          : "Resta utile ma viene dopo la prima priorità.",
    })),
    defer_actions: sorted.slice(5, 8).map((action: any) => ({
      action_id: action.id,
      title: action.title,
      reason: "Azione meno urgente rispetto alle priorità principali di oggi.",
    })),
    reasoning_signals: [
      `Azioni aperte analizzate: ${openActions.length}`,
      context.weeklyStrategy?.weekly_goal
        ? `Weekly goal: ${context.weeklyStrategy.weekly_goal}`
        : "Weekly goal non ancora disponibile",
      context.pattern?.predicted_risk
        ? `Rischio previsto: ${context.pattern.predicted_risk}`
        : "Pattern ancora limitati",
    ],
  };
}

async function generateRebalance(context: any) {
  if (!openai) return fallbackRebalance(context);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: `
Sei l'AI Priority Rebalance Engine di iMemory.

Devi ricalcolare la priorità delle azioni di oggi usando:
- weekly strategy
- predictive brain
- intervention
- autopilot plan
- daily review
- goals
- stato reale delle azioni

Rispondi SOLO in JSON valido:
{
  "title": "titolo breve",
  "summary": "sintesi",
  "top_action_id": 123,
  "quick_win_action_id": 456,
  "confidence_score": 1-100,
  "warning": "avviso operativo",
  "recommended_order": [
    {
      "action_id": 123,
      "title": "azione",
      "priority": "high | medium | low",
      "impact_score": 85,
      "mode": "do_now | next | later",
      "reason": "perché"
    }
  ],
  "defer_actions": [
    {
      "action_id": 789,
      "title": "azione da rimandare",
      "reason": "perché"
    }
  ],
  "reasoning_signals": ["segnale 1", "segnale 2", "segnale 3"]
}

Regole:
- italiano
- usa solo action_id reali presenti nei dati
- massimo 5 recommended_order
- massimo 3 defer_actions
- massimo 3 reasoning_signals
- non inventare nuove azioni
- se non hai dati sufficienti, crea una priorità ragionevole dalle azioni esistenti
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

    const existingActionIds = new Set(
      (context.actions || []).map((item: any) => Number(item.id))
    );

    const recommendedOrder = Array.isArray(parsed.recommended_order)
      ? parsed.recommended_order
          .slice(0, 5)
          .filter((item: any) => existingActionIds.has(Number(item.action_id)))
          .map((item: any) => ({
            action_id: Number(item.action_id),
            title: cleanText(item.title).slice(0, 140),
            priority: clampPriority(item.priority),
            impact_score: clampScore(item.impact_score),
            mode:
              item.mode === "do_now" || item.mode === "later"
                ? item.mode
                : "next",
            reason: cleanText(item.reason).slice(0, 220),
          }))
      : [];

    const deferActions = Array.isArray(parsed.defer_actions)
      ? parsed.defer_actions
          .slice(0, 3)
          .filter((item: any) => existingActionIds.has(Number(item.action_id)))
          .map((item: any) => ({
            action_id: Number(item.action_id),
            title: cleanText(item.title).slice(0, 140),
            reason: cleanText(item.reason).slice(0, 220),
          }))
      : [];

    const fallback = fallbackRebalance(context);

    return {
      title: cleanText(parsed.title).slice(0, 120) || "Priority Rebalance",
      summary:
        cleanText(parsed.summary) ||
        "iMemory ha ricalcolato la priorità delle azioni.",
      top_action_id: existingActionIds.has(Number(parsed.top_action_id))
        ? Number(parsed.top_action_id)
        : fallback.top_action_id,
      quick_win_action_id: existingActionIds.has(Number(parsed.quick_win_action_id))
        ? Number(parsed.quick_win_action_id)
        : fallback.quick_win_action_id,
      confidence_score: clampScore(parsed.confidence_score),
      warning:
        cleanText(parsed.warning) ||
        "Esegui una sola azione prima di cambiare task.",
      recommended_order:
        recommendedOrder.length > 0 ? recommendedOrder : fallback.recommended_order,
      defer_actions: deferActions,
      reasoning_signals: Array.isArray(parsed.reasoning_signals)
        ? parsed.reasoning_signals.slice(0, 3).map((item: any) => cleanText(item))
        : fallback.reasoning_signals,
    };
  } catch (error) {
    console.log("AI PRIORITY REBALANCE ERROR:", error);
    return fallbackRebalance(context);
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
        .from("ai_priority_rebalances")
        .select("*")
        .eq("user_id", user.id)
        .eq("rebalance_date", today)
        .maybeSingle();

      if (existing) {
        return Response.json({
          rebalance: existing,
          source: "existing",
        });
      }
    }

    const context = await getRebalanceContext(user.id, today);
    const ai = await generateRebalance(context);

    const { data: rebalance, error } = await supabaseAdmin
      .from("ai_priority_rebalances")
      .upsert(
        {
          user_id: user.id,
          rebalance_date: today,
          title: ai.title,
          summary: ai.summary,
          top_action_id: ai.top_action_id,
          quick_win_action_id: ai.quick_win_action_id,
          confidence_score: ai.confidence_score,
          warning: ai.warning,
          recommended_order: ai.recommended_order,
          defer_actions: ai.defer_actions,
          reasoning_signals: ai.reasoning_signals,
          applied: false,
          applied_at: null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,rebalance_date",
        }
      )
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      rebalance,
      source: "generated",
    });
  } catch (error: any) {
    console.log("AI PRIORITY REBALANCE GET ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore Priority Rebalance",
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
    const rebalanceId = Number(body.rebalanceId);

    if (!rebalanceId) {
      return Response.json({ error: "Rebalance ID mancante" }, { status: 400 });
    }

    const { data: rebalance, error: readError } = await supabaseAdmin
      .from("ai_priority_rebalances")
      .select("*")
      .eq("id", rebalanceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (readError || !rebalance) {
      return Response.json({ error: "Rebalance non trovato" }, { status: 404 });
    }

    const recommended = Array.isArray(rebalance.recommended_order)
      ? rebalance.recommended_order
      : [];

    const deferred = Array.isArray(rebalance.defer_actions)
      ? rebalance.defer_actions
      : [];

    for (const item of recommended) {
      const actionId = Number(item.action_id);
      if (!actionId) continue;

      await supabaseAdmin
        .from("ai_actions")
        .update({
          priority: clampPriority(item.priority),
          impact_score: clampScore(item.impact_score),
          updated_at: new Date().toISOString(),
        })
        .eq("id", actionId)
        .eq("user_id", user.id);
    }

    for (const item of deferred) {
      const actionId = Number(item.action_id);
      if (!actionId) continue;

      await supabaseAdmin
        .from("ai_actions")
        .update({
          priority: "low",
          impact_score: 45,
          updated_at: new Date().toISOString(),
        })
        .eq("id", actionId)
        .eq("user_id", user.id);
    }

    const { data: updated, error } = await supabaseAdmin
      .from("ai_priority_rebalances")
      .update({
        applied: true,
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", rebalanceId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      rebalance: updated,
    });
  } catch (error: any) {
    console.log("AI PRIORITY REBALANCE PATCH ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore applicazione Priority Rebalance",
      },
      { status: 500 }
    );
  }
}