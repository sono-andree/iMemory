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

function clampMinutes(value: any) {
  const n = Number(value || 15);

  if (Number.isNaN(n)) return 15;

  return Math.max(5, Math.min(90, Math.round(n)));
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

async function getAutopilotContext(userId: string, date: string) {
  const since = daysAgo(7);


  const { data: actions } = await supabaseAdmin
    .from("ai_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("action_date", date)
    .order("status", { ascending: false })
    .order("impact_score", { ascending: false });

  const { data: report } = await supabaseAdmin
    .from("brain_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("report_date", date)
    .eq("report_type", "daily")
    .maybeSingle();

  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select(
      "id, title, description, status, priority, deadline, ai_strategy, ai_next_action, ai_risk"
    )
    .eq("user_id", userId)
    .neq("status", "Completato")
    .order("id", { ascending: false })
    .limit(6);

  const { data: focusDays } = await supabaseAdmin
    .from("focus_days")
    .select("id, focus_date, mission, reason, risk, energy_tip")
    .eq("user_id", userId)
    .order("focus_date", { ascending: false })
    .limit(3);

  const { data: checkins } = await supabaseAdmin
    .from("daily_checkins")
    .select("id, checkin_date, mood, energy, main_focus, blocker, note, ai_reflection")
    .eq("user_id", userId)
    .order("checkin_date", { ascending: false })
    .limit(5);

  const { data: sessions } = await supabaseAdmin
    .from("ai_action_sessions")
    .select("id, action_id, duration_seconds, note, ai_reflection, completed, created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("id", { ascending: false })
    .limit(10);

  const { data: connections } = await supabaseAdmin
    .from("neural_connections")
    .select("id, title, reason, strength, suggested_action")
    .eq("user_id", userId)
    .order("strength", { ascending: false })
    .limit(5);

    const { data: latestIntervention } = await supabaseAdmin
  .from("ai_interventions")
  .select(
    "intervention_date, title, severity, diagnosis, trigger_reason, micro_action, expected_result, protocol, status, related_action_id"
  )
  .eq("user_id", userId)
  .order("intervention_date", { ascending: false })
  .limit(1)
  .maybeSingle();

  const { data: latestWeeklyStrategy } = await supabaseAdmin
  .from("ai_weekly_strategies")
  .select(
    "week_start, week_end, title, summary, weekly_goal, priority_focus, operating_rule, risk_to_avoid, success_definition, success_metrics, weekly_plan, key_actions, anti_failure_rules"
  )
  .eq("user_id", userId)
  .order("week_start", { ascending: false })
  .limit(1)
  .maybeSingle();

  const { data: latestPriorityRebalance } = await supabaseAdmin
  .from("ai_priority_rebalances")
  .select(
    "rebalance_date, title, summary, top_action_id, quick_win_action_id, confidence_score, warning, recommended_order, defer_actions, reasoning_signals, applied"
  )
  .eq("user_id", userId)
  .order("rebalance_date", { ascending: false })
  .limit(1)
  .maybeSingle();

  const { data: latestOperatingRules } = await supabaseAdmin
  .from("ai_operating_rules")
  .select(
    "rule_date, title, summary, primary_rule, focus_rule, planning_rule, priority_rule, rescue_rule, anti_failure_rule, confidence_score, rules, triggers, evidence, active"
  )
  .eq("user_id", userId)
  .eq("active", true)
  .order("rule_date", { ascending: false })
  .limit(1)
  .maybeSingle();

  return {
    actions: actions || [],
    report: report || null,
    goals: goals || [],
    focusDays: focusDays || [],
    checkins: checkins || [],
    sessions: sessions || [],
    connections: connections || [],
    latestIntervention: latestIntervention || null,
    latestWeeklyStrategy: latestWeeklyStrategy || null,
    latestPriorityRebalance: latestPriorityRebalance || null,
    latestOperatingRules: latestOperatingRules || null,
  };
}

function fallbackPlan(context: any) {
  const todoActions = (context.actions || []).filter(
    (item: any) => item.status !== "completed"
  );

  const blocks = todoActions.slice(0, 4).map((action: any, index: number) => ({
    label: index === 0 ? "Deep Work" : "Execution",
    title: action.title,
    description:
      action.description ||
      "Completa questa azione seguendo la guida AI nella pagina Action Center.",
    minutes: clampMinutes(
      String(action.effort || "").includes("30")
        ? 30
        : String(action.effort || "").includes("10")
        ? 10
        : 15
    ),
    action_id: action.id,
    priority: action.priority || "medium",
    completed: action.status === "completed",
  }));

  return {
    title: "Autopilot operativo di oggi",
    overview:
      "iMemory ha costruito un piano essenziale per trasformare le azioni AI in progresso reale.",
    energy_mode: "Focused execution",
    main_objective:
      context.report?.main_objective ||
      context.report?.opportunity ||
      "Completare almeno una azione ad alto impatto.",
    estimated_total_minutes: blocks.reduce(
      (sum: number, block: any) => sum + Number(block.minutes || 0),
      0
    ),
    success_criteria: [
      "Completa almeno una azione ad alto impatto.",
      "Salva una nota di esecuzione.",
      "Chiudi la giornata con un progresso visibile.",
    ],
    time_blocks: blocks.length
      ? blocks
      : [
          {
            label: "Start",
            title: "Genera o scegli una prima azione AI",
            description:
              "Crea azioni dalla queue e seleziona quella con maggiore impatto.",
            minutes: 10,
            action_id: null,
            priority: "medium",
            completed: false,
          },
        ],
    anti_block_protocol: [
      "Se ti blocchi, riduci l'azione a 5 minuti.",
      "Non cambiare task: completa una prima versione grezza.",
      "Scrivi cosa manca invece di ricominciare da zero.",
    ],
    recovery_plan:
      "Se perdi focus, torna alla prima azione incompleta e completa solo il prossimo micro-step.",
  };
}

async function generatePlan(context: any) {
  if (!openai) {
    return fallbackPlan(context);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.55,
      messages: [
        {
          role: "system",
          content: `
Sei l'AI Autopilot Planner di iMemory.

Devi creare il piano operativo della giornata dell'utente usando azioni AI, brain report, goals, focus, check-in e sessioni precedenti.

Rispondi SOLO in JSON valido:
{
  "title": "titolo breve",
  "overview": "sintesi del piano",
  "energy_mode": "modalità energetica",
  "main_objective": "obiettivo principale di oggi",
  "estimated_total_minutes": 45,
  "success_criteria": ["criterio 1", "criterio 2", "criterio 3"],
  "time_blocks": [
    {
      "label": "Deep Work",
      "title": "titolo blocco",
      "description": "cosa fare esattamente",
      "minutes": 15,
      "action_id": 123,
      "priority": "high | medium | low",
      "completed": false
    }
  ],
  "anti_block_protocol": ["regola 1", "regola 2", "regola 3"],
  "recovery_plan": "cosa fare se la giornata va male"
}

Regole:
- italiano
- massimo 5 blocchi
- ogni blocco deve essere eseguibile oggi
- se esistono ai_actions, usa i loro id in action_id
- non creare un piano generico
- fai una strategia concreta, ordinata e realistica
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

    const blocks = Array.isArray(parsed.time_blocks)
      ? parsed.time_blocks.slice(0, 5).map((block: any) => ({
          label: cleanText(block.label).slice(0, 40) || "Execution",
          title: cleanText(block.title).slice(0, 120) || "Blocco operativo",
          description:
            cleanText(block.description).slice(0, 240) ||
            "Completa questo blocco operativo.",
          minutes: clampMinutes(block.minutes),
          action_id: block.action_id ? Number(block.action_id) : null,
          priority:
            block.priority === "high" || block.priority === "low"
              ? block.priority
              : "medium",
          completed: Boolean(block.completed),
        }))
      : fallbackPlan(context).time_blocks;

    return {
      title:
        cleanText(parsed.title).slice(0, 120) || "Autopilot operativo di oggi",
      overview:
        cleanText(parsed.overview) ||
        "iMemory ha creato un piano operativo per la giornata.",
      energy_mode: cleanText(parsed.energy_mode) || "Focused execution",
      main_objective:
        cleanText(parsed.main_objective) ||
        "Completare una azione ad alto impatto.",
      estimated_total_minutes: clampMinutes(parsed.estimated_total_minutes),
      success_criteria: Array.isArray(parsed.success_criteria)
        ? parsed.success_criteria
            .slice(0, 4)
            .map((item: any) => cleanText(item).slice(0, 180))
        : fallbackPlan(context).success_criteria,
      time_blocks: blocks,
      anti_block_protocol: Array.isArray(parsed.anti_block_protocol)
        ? parsed.anti_block_protocol
            .slice(0, 4)
            .map((item: any) => cleanText(item).slice(0, 180))
        : fallbackPlan(context).anti_block_protocol,
      recovery_plan:
        cleanText(parsed.recovery_plan) ||
        fallbackPlan(context).recovery_plan,
    };
  } catch (error) {
    console.log("AI AUTOPILOT GENERATION ERROR:", error);
    return fallbackPlan(context);
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
    const date = url.searchParams.get("date") || getToday();

    if (!force) {
      const { data: existingPlan } = await supabaseAdmin
        .from("ai_daily_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("plan_date", date)
        .maybeSingle();

      if (existingPlan) {
        return Response.json({
          plan: existingPlan,
          source: "existing",
        });
      }
    }

    const context = await getAutopilotContext(user.id, date);
    const plan = await generatePlan(context);

    const { data: savedPlan, error } = await supabaseAdmin
      .from("ai_daily_plans")
      .upsert(
        {
          user_id: user.id,
          plan_date: date,
          title: plan.title,
          overview: plan.overview,
          energy_mode: plan.energy_mode,
          main_objective: plan.main_objective,
          estimated_total_minutes: plan.estimated_total_minutes,
          success_criteria: plan.success_criteria,
          time_blocks: plan.time_blocks,
          anti_block_protocol: plan.anti_block_protocol,
          recovery_plan: plan.recovery_plan,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,plan_date",
        }
      )
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      plan: savedPlan,
      source: "generated",
    });
  } catch (error: any) {
    console.log("AI AUTOPILOT GET ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore AI Autopilot",
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

    const date = body.date || getToday();
    const blockIndex = Number(body.blockIndex);
    const completed = Boolean(body.completed);

    if (Number.isNaN(blockIndex)) {
      return Response.json({ error: "Block index non valido" }, { status: 400 });
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from("ai_daily_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("plan_date", date)
      .maybeSingle();

    if (planError || !plan) {
      return Response.json({ error: "Piano non trovato" }, { status: 404 });
    }

    const blocks = Array.isArray(plan.time_blocks) ? [...plan.time_blocks] : [];

    if (!blocks[blockIndex]) {
      return Response.json({ error: "Blocco non trovato" }, { status: 404 });
    }

    blocks[blockIndex] = {
      ...blocks[blockIndex],
      completed,
    };

    const { data: updatedPlan, error } = await supabaseAdmin
      .from("ai_daily_plans")
      .update({
        time_blocks: blocks,
        updated_at: new Date().toISOString(),
      })
      .eq("id", plan.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      plan: updatedPlan,
    });
  } catch (error: any) {
    console.log("AI AUTOPILOT PATCH ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore aggiornamento piano",
      },
      { status: 500 }
    );
  }
}