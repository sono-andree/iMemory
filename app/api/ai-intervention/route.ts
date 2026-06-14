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

function clampSeverity(value: any) {
  const severity = cleanText(value).toLowerCase();

  if (severity === "high") return "high";
  if (severity === "low") return "low";

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

async function getInterventionContext(userId: string, date: string) {
  const since7 = daysAgo(7);

  const { data: pattern } = await supabaseAdmin
    .from("ai_brain_patterns")
    .select("*")
    .eq("user_id", userId)
    .eq("pattern_date", date)
    .maybeSingle();

  const { data: latestPattern } = await supabaseAdmin
    .from("ai_brain_patterns")
    .select("*")
    .eq("user_id", userId)
    .order("pattern_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: plan } = await supabaseAdmin
    .from("ai_daily_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_date", date)
    .maybeSingle();

  const { data: review } = await supabaseAdmin
    .from("ai_daily_reviews")
    .select("*")
    .eq("user_id", userId)
    .eq("review_date", date)
    .maybeSingle();

  const { data: actions } = await supabaseAdmin
    .from("ai_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("action_date", date)
    .order("impact_score", { ascending: false });

  const { data: sessions } = await supabaseAdmin
    .from("ai_action_sessions")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", since7)
    .order("id", { ascending: false })
    .limit(15);

  const { data: checkins } = await supabaseAdmin
    .from("daily_checkins")
    .select("*")
    .eq("user_id", userId)
    .order("checkin_date", { ascending: false })
    .limit(5);

  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select("id, title, description, status, priority, ai_risk, ai_next_action")
    .eq("user_id", userId)
    .neq("status", "Completato")
    .order("id", { ascending: false })
    .limit(6);

  return {
    pattern: pattern || latestPattern || null,
    plan: plan || null,
    review: review || null,
    actions: actions || [],
    sessions: sessions || [],
    checkins: checkins || [],
    goals: goals || [],
  };
}

function fallbackIntervention(context: any) {
  const actions = context.actions || [];

  const bestAction =
    actions.find(
      (item: any) =>
        item.status !== "completed" &&
        (item.priority === "high" || Number(item.impact_score || 0) >= 80)
    ) ||
    actions.find((item: any) => item.status !== "completed") ||
    null;

  const openActions = actions.filter((item: any) => item.status !== "completed");
  const completedActions = actions.filter((item: any) => item.status === "completed");

  const severity =
    openActions.length >= 4 && completedActions.length === 0 ? "high" : "medium";

  return {
    title: "Rescue Mode consigliato",
    severity,
    diagnosis:
      context.pattern?.predicted_risk ||
      "iMemory rileva rischio di dispersione: troppe azioni aperte e poco completamento visibile.",
    trigger_reason:
      context.pattern?.recurring_blocker ||
      "Il sistema ha trovato azioni non completate e serve una micro-azione immediata.",
    micro_action:
      bestAction?.title ||
      "Apri l'AI Coach e completa una singola micro-azione da 5 minuti.",
    expected_result:
      "Creare un output minimo visibile e ridurre la frizione per continuare.",
    protocol: [
      "Non scegliere una nuova attività.",
      "Apri solo l'azione consigliata.",
      "Lavora per 5 minuti senza cambiare contesto.",
      "Scrivi una nota finale anche se il risultato è piccolo.",
    ],
    related_action_id: bestAction?.id || null,
    related_goal_id: null,
  };
}

async function generateIntervention(context: any) {
  if (!openai) return fallbackIntervention(context);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.45,
      messages: [
        {
          role: "system",
          content: `
Sei l'AI Intervention Engine di iMemory.

Devi intervenire quando l'utente rischia di bloccarsi, rimandare o perdere focus.

Rispondi SOLO in JSON valido:
{
  "title": "titolo breve",
  "severity": "low | medium | high",
  "diagnosis": "diagnosi concreta",
  "trigger_reason": "perche' il sistema interviene ora",
  "micro_action": "azione immediata da fare in 5-10 minuti",
  "expected_result": "risultato minimo atteso",
  "protocol": ["step 1", "step 2", "step 3", "step 4"],
  "related_action_id": 123,
  "related_goal_id": 456
}

Regole:
- italiano
- concreto
- niente motivazione generica
- massimo 4 step nel protocollo
- se esiste una ai_action utile, usa il suo id in related_action_id
- l'intervento deve essere eseguibile subito
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
      title: cleanText(parsed.title).slice(0, 120) || "AI Intervention",
      severity: clampSeverity(parsed.severity),
      diagnosis:
        cleanText(parsed.diagnosis) ||
        "iMemory rileva un rischio operativo da correggere subito.",
      trigger_reason:
        cleanText(parsed.trigger_reason) ||
        "Il sistema ha individuato un pattern che può ridurre il completamento.",
      micro_action:
        cleanText(parsed.micro_action) ||
        "Completa una micro-azione con AI Coach.",
      expected_result:
        cleanText(parsed.expected_result) ||
        "Ottenere un output minimo e ridurre il blocco.",
      protocol: Array.isArray(parsed.protocol)
        ? parsed.protocol.slice(0, 4).map((item: any) => cleanText(item))
        : fallbackIntervention(context).protocol,
      related_action_id: parsed.related_action_id
        ? Number(parsed.related_action_id)
        : null,
      related_goal_id: parsed.related_goal_id ? Number(parsed.related_goal_id) : null,
    };
  } catch (error) {
    console.log("AI INTERVENTION GENERATION ERROR:", error);
    return fallbackIntervention(context);
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
      const { data: existing } = await supabaseAdmin
        .from("ai_interventions")
        .select("*")
        .eq("user_id", user.id)
        .eq("intervention_date", date)
        .maybeSingle();

      if (existing) {
        return Response.json({
          intervention: existing,
          source: "existing",
        });
      }
    }

    const context = await getInterventionContext(user.id, date);
    const ai = await generateIntervention(context);

    const { data: intervention, error } = await supabaseAdmin
      .from("ai_interventions")
      .upsert(
        {
          user_id: user.id,
          intervention_date: date,
          title: ai.title,
          severity: ai.severity,
          diagnosis: ai.diagnosis,
          trigger_reason: ai.trigger_reason,
          micro_action: ai.micro_action,
          expected_result: ai.expected_result,
          protocol: ai.protocol,
          related_action_id: ai.related_action_id,
          related_goal_id: ai.related_goal_id,
          status: "active",
          resolved_at: null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,intervention_date",
        }
      )
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      intervention,
      source: "generated",
    });
  } catch (error: any) {
    console.log("AI INTERVENTION GET ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore AI Intervention",
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

    const interventionId = Number(body.interventionId);
    const status = cleanText(body.status || "resolved");

    if (!interventionId) {
      return Response.json({ error: "Intervention ID mancante" }, { status: 400 });
    }

    const nextStatus =
      status === "dismissed" || status === "snoozed" || status === "resolved"
        ? status
        : "resolved";

    const { data: intervention, error } = await supabaseAdmin
      .from("ai_interventions")
      .update({
        status: nextStatus,
        resolved_at: nextStatus === "resolved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", interventionId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      intervention,
    });
  } catch (error: any) {
    console.log("AI INTERVENTION PATCH ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore aggiornamento intervento",
      },
      { status: 500 }
    );
  }
}