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

type AIActionDraft = {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  effort: string;
  impact_score: number;
  source_type: string;
  source_id: string;
  ai_reason: string;
};

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
  const score = Number(value || 70);

  if (Number.isNaN(score)) return 70;

  return Math.max(1, Math.min(100, Math.round(score)));
}

function makeKey(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9à-ÿ]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
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

async function getActionContext(userId: string) {
  const today = getToday();

  const { data: report } = await supabaseAdmin
    .from("brain_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("report_date", today)
    .eq("report_type", "daily")
    .maybeSingle();

  const { data: connections } = await supabaseAdmin
    .from("neural_connections")
    .select("*")
    .eq("user_id", userId)
    .order("strength", { ascending: false })
    .limit(6);

  const { data: resurfacing } = await supabaseAdmin
    .from("memory_resurfacing_events")
    .select("*")
    .eq("user_id", userId)
    .eq("resurfaced_date", today)
    .order("priority_score", { ascending: false })
    .limit(4);

  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select(
      "id, title, description, status, priority, deadline, ai_strategy, ai_next_action, ai_risk"
    )
    .eq("user_id", userId)
    .neq("status", "Completato")
    .order("id", { ascending: false })
    .limit(6);

  const { data: focusActions } = await supabaseAdmin
    .from("focus_actions")
    .select("id, text, completed, priority, goal_id, goal_step_id")
    .eq("user_id", userId)
    .eq("completed", false)
    .order("priority", { ascending: false })
    .limit(8);

  const { data: checkins } = await supabaseAdmin
    .from("daily_checkins")
    .select("id, checkin_date, mood, energy, main_focus, blocker, note, ai_reflection")
    .eq("user_id", userId)
    .order("checkin_date", { ascending: false })
    .limit(3);

  return {
    report: report || null,
    connections: connections || [],
    resurfacing: resurfacing || [],
    goals: goals || [],
    focusActions: focusActions || [],
    checkins: checkins || [],
  };
}

function fallbackActions(context: any): AIActionDraft[] {
  const actions: AIActionDraft[] = [];

  const reportActions = Array.isArray(context.report?.next_actions)
    ? context.report.next_actions
    : [];

  for (const item of reportActions.slice(0, 3)) {
    actions.push({
      title: cleanText(item).slice(0, 90),
      description: "Azione suggerita dal Brain Report giornaliero.",
      priority: "high",
      effort: "15min",
      impact_score: 80,
      source_type: "brain_report",
      source_id: String(context.report?.id || "daily"),
      ai_reason: "Questa azione viene dal report AI del giorno.",
    });
  }

  for (const action of (context.focusActions || []).slice(0, 2)) {
    actions.push({
      title: cleanText(action.text).slice(0, 90),
      description: "Focus action rimasta aperta.",
      priority: "medium",
      effort: "10min",
      impact_score: 70,
      source_type: "focus_action",
      source_id: String(action.id),
      ai_reason: "Completare questa azione aumenta continuità e momentum.",
    });
  }

  return actions.slice(0, 5);
}

async function generateActions(context: any) {
  if (!openai) {
    return fallbackActions(context);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: `
Sei l'AI Action System di iMemory.

Devi trasformare report, connessioni neurali, focus, goals e resurfacing in azioni concrete.

Rispondi SOLO in JSON valido:
{
  "actions": [
    {
      "title": "azione breve",
      "description": "descrizione operativa",
      "priority": "high | medium | low",
      "effort": "5min | 10min | 15min | 30min",
      "impact_score": 1-100,
      "source_type": "brain_report | neural_connection | resurfacing | goal | focus_action",
      "source_id": "id",
      "ai_reason": "perché questa azione è importante"
    }
  ]
}

Regole:
- massimo 5 azioni
- azioni concrete, non generiche
- ogni azione deve poter essere completata oggi
- italiano
- title massimo 90 caratteri
- description massimo 160 caratteri
- ai_reason massimo 160 caratteri
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

    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];

    return actions.slice(0, 5).map((item: any) => ({
      title: cleanText(item.title).slice(0, 90) || "Azione iMemory",
      description:
        cleanText(item.description).slice(0, 180) ||
        "Completa questa micro-azione per avanzare oggi.",
      priority:
        item.priority === "high" || item.priority === "low"
          ? item.priority
          : "medium",
      effort: cleanText(item.effort).slice(0, 20) || "15min",
      impact_score: clampScore(item.impact_score),
      source_type: cleanText(item.source_type) || "brain_report",
      source_id: cleanText(item.source_id) || "daily",
      ai_reason:
        cleanText(item.ai_reason).slice(0, 180) ||
        "Questa azione può migliorare continuità e chiarezza.",
    }));
  } catch (error) {
    console.log("AI ACTION GENERATION ERROR:", error);
    return fallbackActions(context);
  }
}

async function saveActions(userId: string, actionDate: string, drafts: AIActionDraft[]) {
  const saved = [];

  for (const draft of drafts) {
    const dedupeKey = `${actionDate}_${draft.source_type}_${draft.source_id}_${makeKey(
      draft.title
    )}`;

    const { data, error } = await supabaseAdmin
      .from("ai_actions")
      .upsert(
        {
          user_id: userId,
          action_date: actionDate,
          title: draft.title,
          description: draft.description,
          priority: draft.priority,
          effort: draft.effort,
          impact_score: draft.impact_score,
          source_type: draft.source_type,
          source_id: draft.source_id,
          ai_reason: draft.ai_reason,
          status: "todo",
          dedupe_key: dedupeKey,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,dedupe_key",
        }
      )
      .select()
      .single();

    if (!error && data) {
      saved.push(data);
    }

    if (error) {
      console.log("SAVE AI ACTION ERROR:", error);
    }
  }

  return saved;
}

async function awardActionXP(userId: string, actionId: number) {
  const xp = 12;
  const dedupeKey = `ai_action_completed_${actionId}`;

  const { data: existing } = await supabaseAdmin
    .from("brain_activity")
    .select("id")
    .eq("user_id", userId)
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();

  if (existing) return;

  await supabaseAdmin.from("brain_activity").insert({
    user_id: userId,
    type: "ai_action_completed",
    title: "AI action completata",
    xp,
    dedupe_key: dedupeKey,
    metadata: {
      action_id: actionId,
    },
  });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("brain_score")
    .eq("id", userId)
    .maybeSingle();

  await supabaseAdmin
    .from("profiles")
    .update({
      brain_score: (profile?.brain_score || 0) + xp,
    })
    .eq("id", userId);
}

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return Response.json({ error: "Utente non autorizzato" }, { status: 401 });
    }

    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    const today = url.searchParams.get("date") || getToday();

    if (force) {
      await supabaseAdmin
        .from("ai_actions")
        .delete()
        .eq("user_id", user.id)
        .eq("action_date", today)
        .neq("status", "completed");
    }

    const { data: existingActions } = await supabaseAdmin
      .from("ai_actions")
      .select("*")
      .eq("user_id", user.id)
      .eq("action_date", today)
      .order("status", { ascending: false })
      .order("impact_score", { ascending: false });

    if (!force && existingActions && existingActions.length > 0) {
      return Response.json({
        actions: existingActions,
        source: "existing",
      });
    }

    const context = await getActionContext(user.id);
    const drafts = await generateActions(context);
    const saved = await saveActions(user.id, today, drafts);

    const { data: actions } = await supabaseAdmin
      .from("ai_actions")
      .select("*")
      .eq("user_id", user.id)
      .eq("action_date", today)
      .order("status", { ascending: false })
      .order("impact_score", { ascending: false });

    return Response.json({
      actions: actions || saved,
      source: "generated",
    });
  } catch (error: any) {
    console.log("AI ACTIONS GET ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore AI Actions",
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

    const actionId = Number(body.actionId);
    const completed = Boolean(body.completed);

    if (!actionId) {
      return Response.json({ error: "Action ID non valido" }, { status: 400 });
    }

    const { data: action, error } = await supabaseAdmin
      .from("ai_actions")
      .update({
        status: completed ? "completed" : "todo",
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", actionId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (completed) {
      await awardActionXP(user.id, actionId);
    }

    return Response.json({
      action,
    });
  } catch (error: any) {
    console.log("AI ACTIONS PATCH ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore aggiornamento azione",
      },
      { status: 500 }
    );
  }
}