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

function getDayStart(date: string) {
  return `${date}T00:00:00.000Z`;
}

function getDayEnd(date: string) {
  return `${date}T23:59:59.999Z`;
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

async function getReviewContext(userId: string, date: string) {
  const start = getDayStart(date);
  const end = getDayEnd(date);

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
    .gte("created_at", start)
    .lte("created_at", end)
    .order("id", { ascending: false });

  const { data: plan } = await supabaseAdmin
    .from("ai_daily_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_date", date)
    .maybeSingle();

  const { data: report } = await supabaseAdmin
    .from("brain_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("report_date", date)
    .eq("report_type", "daily")
    .maybeSingle();

  const { data: checkin } = await supabaseAdmin
    .from("daily_checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("checkin_date", date)
    .maybeSingle();

  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select("id, title, description, status, priority, ai_next_action, ai_risk")
    .eq("user_id", userId)
    .neq("status", "Completato")
    .order("id", { ascending: false })
    .limit(5);

  const { data: neuralConnections } = await supabaseAdmin
    .from("neural_connections")
    .select("id, title, reason, strength, suggested_action")
    .eq("user_id", userId)
    .order("strength", { ascending: false })
    .limit(5);

  const { data: brainActivity } = await supabaseAdmin
    .from("brain_activity")
    .select("id, type, title, xp, created_at")
    .eq("user_id", userId)
    .gte("created_at", start)
    .lte("created_at", end)
    .order("id", { ascending: false });

  return {
    actions: actions || [],
    sessions: sessions || [],
    plan: plan || null,
    report: report || null,
    checkin: checkin || null,
    goals: goals || [],
    neuralConnections: neuralConnections || [],
    brainActivity: brainActivity || [],
  };
}

function fallbackReview(context: any) {
  const actions = context.actions || [];
  const completed = actions.filter((item: any) => item.status === "completed");
  const completionRate =
    actions.length === 0 ? 0 : Math.round((completed.length / actions.length) * 100);

  const totalSeconds = (context.sessions || []).reduce(
    (sum: number, session: any) => sum + Number(session.duration_seconds || 0),
    0
  );

  const focusScore = Math.min(100, Math.max(40, Math.round(totalSeconds / 60) * 4));

  return {
    title: "Daily Review AI",
    summary:
      actions.length === 0
        ? "Oggi non ci sono abbastanza azioni registrate, ma iMemory ha preparato una base per migliorare il piano di domani."
        : `Hai completato ${completed.length} azioni su ${actions.length}. Il dato più importante è trasformare il lavoro fatto in continuità domani.`,
    completion_score: completionRate || 55,
    focus_score: focusScore || 60,
    momentum_score: Math.round(((completionRate || 55) + (focusScore || 60)) / 2),
    what_worked: [
      "Hai creato un sistema operativo con azioni tracciabili.",
      "Le sessioni registrate aiutano iMemory a capire meglio il tuo modo di lavorare.",
    ],
    blockers: [
      "Il rischio principale è lasciare azioni aperte senza chiusura.",
      "Troppe azioni non completate possono ridurre chiarezza e momentum.",
    ],
    lessons: [
      "Il progresso migliore nasce da blocchi brevi e chiusi.",
      "Ogni azione completata rende il piano successivo più intelligente.",
    ],
    suggested_next_actions: [
      "Domani parti dalla prima azione incompleta ad alto impatto.",
      "Fai una sessione breve da 15 minuti prima di aggiungere nuove attività.",
      "Chiudi ogni sessione con una nota concreta.",
    ],
    tomorrow_strategy:
      "Inizia con una sola azione ad alto impatto, completala in modalità AI Coach e solo dopo passa alla successiva.",
    memory_note:
      "Review giornaliera: iMemory ha analizzato azioni, sessioni e piano operativo per migliorare la strategia di domani.",
  };
}

async function generateReview(context: any, date: string) {
  if (!openai) {
    return fallbackReview(context);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.55,
      messages: [
        {
          role: "system",
          content: `
Sei l'AI Daily Review Engine di iMemory.

Devi analizzare la giornata dell'utente e creare una review intelligente che aiuti il sistema a migliorare il piano di domani.

Rispondi SOLO in JSON valido:
{
  "title": "titolo breve",
  "summary": "sintesi della giornata",
  "completion_score": 1-100,
  "focus_score": 1-100,
  "momentum_score": 1-100,
  "what_worked": ["cosa ha funzionato"],
  "blockers": ["blocchi o rischi"],
  "lessons": ["lezioni operative"],
  "suggested_next_actions": ["azioni suggerite per domani"],
  "tomorrow_strategy": "strategia per domani",
  "memory_note": "nota sintetica da salvare come memoria"
}

Regole:
- italiano
- tono premium, operativo, intelligente
- niente motivazione generica
- massimo 3 elementi per array
- analizza davvero completamento, focus, sessioni e blocchi
- devi aiutare iMemory a capire cosa fare meglio domani
          `,
        },
        {
          role: "user",
          content: `
Data review: ${date}

Dati della giornata:
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
      title: cleanText(parsed.title).slice(0, 120) || "Daily Review AI",
      summary:
        cleanText(parsed.summary) ||
        "iMemory ha analizzato la giornata e generato una review operativa.",
      completion_score: clampScore(parsed.completion_score),
      focus_score: clampScore(parsed.focus_score),
      momentum_score: clampScore(parsed.momentum_score),
      what_worked: Array.isArray(parsed.what_worked)
        ? parsed.what_worked.slice(0, 3).map((item: any) => cleanText(item))
        : [],
      blockers: Array.isArray(parsed.blockers)
        ? parsed.blockers.slice(0, 3).map((item: any) => cleanText(item))
        : [],
      lessons: Array.isArray(parsed.lessons)
        ? parsed.lessons.slice(0, 3).map((item: any) => cleanText(item))
        : [],
      suggested_next_actions: Array.isArray(parsed.suggested_next_actions)
        ? parsed.suggested_next_actions
            .slice(0, 3)
            .map((item: any) => cleanText(item))
        : [],
      tomorrow_strategy:
        cleanText(parsed.tomorrow_strategy) ||
        "Domani inizia dalla prima azione ad alto impatto.",
      memory_note:
        cleanText(parsed.memory_note) ||
        "Review giornaliera generata da iMemory.",
    };
  } catch (error) {
    console.log("AI DAY REVIEW GENERATION ERROR:", error);
    return fallbackReview(context);
  }
}

async function awardReviewXP(userId: string, date: string) {
  const xp = 25;
  const dedupeKey = `ai_daily_review_closed_${date}`;

  const { data: existing } = await supabaseAdmin
    .from("brain_activity")
    .select("id")
    .eq("user_id", userId)
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();

  if (existing) return;

  await supabaseAdmin.from("brain_activity").insert({
    user_id: userId,
    type: "ai_daily_review",
    title: "Daily Review completata",
    xp,
    dedupe_key: dedupeKey,
    metadata: {
      review_date: date,
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

async function saveReviewAsMemory({
  userId,
  date,
  review,
  userReflection,
}: {
  userId: string;
  date: string;
  review: any;
  userReflection: string;
}) {
  const title = `Daily Review - ${date}`;

  const content = `
${review.summary || ""}

Cosa ha funzionato:
${(review.what_worked || []).map((item: string) => `- ${item}`).join("\n")}

Blocchi:
${(review.blockers || []).map((item: string) => `- ${item}`).join("\n")}

Lezioni:
${(review.lessons || []).map((item: string) => `- ${item}`).join("\n")}

Strategia per domani:
${review.tomorrow_strategy || ""}

Riflessione utente:
${userReflection || ""}
  `.trim();

  await supabaseAdmin.from("memories").insert({
    user_id: userId,
    title,
    content,
    category: "Review",
    summary: review.memory_note || review.summary || "Review giornaliera iMemory",
    keywords: ["daily review", "ai", "autopilot", "azioni", "focus"],
  });
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
      const { data: existingReview } = await supabaseAdmin
        .from("ai_daily_reviews")
        .select("*")
        .eq("user_id", user.id)
        .eq("review_date", date)
        .maybeSingle();

      if (existingReview) {
        return Response.json({
          review: existingReview,
          source: "existing",
        });
      }
    }

    const context = await getReviewContext(user.id, date);
    const ai = await generateReview(context, date);

    const { data: review, error } = await supabaseAdmin
      .from("ai_daily_reviews")
      .upsert(
        {
          user_id: user.id,
          review_date: date,
          title: ai.title,
          summary: ai.summary,
          completion_score: ai.completion_score,
          focus_score: ai.focus_score,
          momentum_score: ai.momentum_score,
          what_worked: ai.what_worked,
          blockers: ai.blockers,
          lessons: ai.lessons,
          suggested_next_actions: ai.suggested_next_actions,
          tomorrow_strategy: ai.tomorrow_strategy,
          memory_note: ai.memory_note,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,review_date",
        }
      )
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      review,
      source: "generated",
    });
  } catch (error: any) {
    console.log("AI DAY REVIEW GET ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore Daily Review",
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
    const userReflection = cleanText(body.userReflection || "");

    const { data: review, error: reviewError } = await supabaseAdmin
      .from("ai_daily_reviews")
      .select("*")
      .eq("user_id", user.id)
      .eq("review_date", date)
      .maybeSingle();

    if (reviewError || !review) {
      return Response.json({ error: "Review non trovata" }, { status: 404 });
    }

    const { data: updatedReview, error } = await supabaseAdmin
      .from("ai_daily_reviews")
      .update({
        user_reflection: userReflection,
        closed: true,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", review.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    await awardReviewXP(user.id, date);

    await saveReviewAsMemory({
      userId: user.id,
      date,
      review,
      userReflection,
    });

    return Response.json({
      review: updatedReview,
    });
  } catch (error: any) {
    console.log("AI DAY REVIEW PATCH ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore chiusura Daily Review",
      },
      { status: 500 }
    );
  }
}