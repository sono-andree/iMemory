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

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
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

function fallbackPlan(body: any) {
  const mainGoal = body.mainGoal || "Organizzare meglio memoria, obiettivi e azioni.";
  const mainProblem = body.mainProblem || "Mancanza di chiarezza operativa.";

  return {
    memoryTitle: "Profilo iniziale iMemory",
    memoryContent: `Obiettivo principale: ${mainGoal}. Problema principale: ${mainProblem}. Area di miglioramento: ${body.area}. Tempo giornaliero disponibile: ${body.dailyTime}. Tipo di memorie importanti: ${body.memoryTypes}.`,
    goalTitle: mainGoal,
    goalDescription: `Obiettivo creato dall'onboarding. Problema da risolvere: ${mainProblem}.`,
    goalSteps: [
      "Definire una prima azione concreta",
      "Salvare almeno 3 memorie importanti",
      "Completare una sessione con AI Coach",
    ],
    actions: [
      {
        title: "Salva la prima memoria importante",
        description: "Aggiungi una memoria utile che iMemory potrà usare per aiutarti meglio.",
        priority: "high",
        effort: "10min",
        impact_score: 80,
        ai_reason: "Serve a dare contesto iniziale al tuo cervello digitale.",
      },
      {
        title: "Completa una sessione AI Coach",
        description: "Apri AI Actions e lavora sulla prima missione guidata.",
        priority: "medium",
        effort: "15min",
        impact_score: 75,
        ai_reason: "Serve a trasformare l'obiettivo in esecuzione reale.",
      },
    ],
    operatingRules: {
      primary_rule: "Lavora su una sola azione alla volta fino a produrre un output visibile.",
      focus_rule: "Usa sessioni brevi da 10-25 minuti.",
      planning_rule: "Prima salva contesto, poi chiedi all'AI di pianificare.",
      priority_rule: "Dai priorità alle azioni che riducono confusione e creano progresso immediato.",
      rescue_rule: "Se ti blocchi, riduci la task a una micro-azione da 5 minuti.",
      anti_failure_rule: "Non creare troppe azioni prima di completare la prima.",
    },
  };
}

async function generatePlan(body: any) {
  if (!openai) return fallbackPlan(body);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: `
Sei l'AI onboarding engine di iMemory.
Devi trasformare le risposte dell'utente in:
- una memoria iniziale
- un goal iniziale
- 3 step del goal
- 2 azioni AI iniziali
- operating rules iniziali

Rispondi SOLO JSON valido:
{
  "memoryTitle": "...",
  "memoryContent": "...",
  "goalTitle": "...",
  "goalDescription": "...",
  "goalSteps": ["...", "...", "..."],
  "actions": [
    {
      "title": "...",
      "description": "...",
      "priority": "high|medium|low",
      "effort": "10min",
      "impact_score": 80,
      "ai_reason": "..."
    }
  ],
  "operatingRules": {
    "primary_rule": "...",
    "focus_rule": "...",
    "planning_rule": "...",
    "priority_rule": "...",
    "rescue_rule": "...",
    "anti_failure_rule": "..."
  }
}
          `,
        },
        {
          role: "user",
          content: JSON.stringify(body, null, 2),
        },
      ],
    });

    const raw = completion.choices[0].message.content || "";
    const match = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : raw);
  } catch (error) {
    console.log("ONBOARDING AI ERROR:", error);
    return fallbackPlan(body);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return Response.json({ error: "Utente non autorizzato" }, { status: 401 });
    }

    const body = await req.json();

    const plan = await generatePlan(body);
    const date = today();

    await supabaseAdmin.from("memories").insert({
      user_id: user.id,
      title: plan.memoryTitle || "Profilo iniziale iMemory",
      content: plan.memoryContent || "",
      category: "Onboarding",
      summary: plan.memoryContent || "",
      keywords: ["onboarding", "profilo", "obiettivo", "imemory"],
    });

    const { data: goal } = await supabaseAdmin
      .from("goals")
      .insert({
        user_id: user.id,
        title: plan.goalTitle || body.mainGoal || "Primo obiettivo",
        description: plan.goalDescription || "",
        category: body.area || "Personale",
        status: "Attivo",
        priority: "Alta",
        ai_strategy: plan.goalDescription || "",
        ai_risk: body.mainProblem || "",
        ai_next_action: Array.isArray(plan.goalSteps) ? plan.goalSteps[0] : "",
      })
      .select()
      .single();

    if (goal && Array.isArray(plan.goalSteps)) {
      await supabaseAdmin.from("goal_steps").insert(
        plan.goalSteps.slice(0, 3).map((step: string, index: number) => ({
          user_id: user.id,
          goal_id: goal.id,
          text: step,
          completed: false,
          position: index + 1,
        }))
      );
    }

    if (Array.isArray(plan.actions)) {
      await supabaseAdmin.from("ai_actions").insert(
        plan.actions.slice(0, 2).map((action: any, index: number) => ({
          user_id: user.id,
          action_date: date,
          title: action.title,
          description: action.description,
          priority: action.priority || "medium",
          effort: action.effort || "15min",
          impact_score: action.impact_score || 75,
          ai_reason: action.ai_reason || "Azione creata dall'onboarding.",
          status: "todo",
          source_type: "onboarding",
          source_id: String(goal?.id || "initial"),
          dedupe_key: `onboarding_${user.id}_${date}_${index}`,
        }))
      );
    }

    const rules = plan.operatingRules || {};

    await supabaseAdmin.from("ai_operating_rules").upsert(
      {
        user_id: user.id,
        rule_date: date,
        title: "Initial Operating Rules",
        summary: "Regole operative create dall'onboarding iniziale.",
        primary_rule: rules.primary_rule,
        focus_rule: rules.focus_rule,
        planning_rule: rules.planning_rule,
        priority_rule: rules.priority_rule,
        rescue_rule: rules.rescue_rule,
        anti_failure_rule: rules.anti_failure_rule,
        confidence_score: 70,
        rules: [
          rules.primary_rule,
          rules.focus_rule,
          rules.priority_rule,
          rules.anti_failure_rule,
        ].filter(Boolean),
        triggers: [body.mainProblem, body.area].filter(Boolean),
        evidence: ["Risposte onboarding iniziale"],
        active: true,
      },
      {
        onConflict: "user_id,rule_date",
      }
    );

    await supabaseAdmin
      .from("profiles")
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_profile: body,
      })
      .eq("id", user.id);

    return Response.json({
      ok: true,
    });
  } catch (error: any) {
    console.log("ONBOARDING ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore onboarding",
      },
      { status: 500 }
    );
  }
}