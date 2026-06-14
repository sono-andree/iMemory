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

function getLocalDateString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

async function generateAIReflection({
  mood,
  energy,
  mainFocus,
  blocker,
  note,
}: {
  mood: string;
  energy: number;
  mainFocus: string;
  blocker: string;
  note: string;
}) {
  if (!openai) {
    return `Oggi il tuo focus principale è: ${mainFocus}. Il blocco da evitare è: ${blocker}. Fai una sola azione concreta e rendila completabile.`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `
Sei il Daily Brain Coach di iMemory.

Devi generare una riflessione breve, personale e operativa per l'utente.
Non essere generico.
Non fare terapia.
Non dare consigli medici.
Dai una spinta concreta per la giornata.

Formato:
- massimo 5 righe
- tono motivante ma realistico
- chiudi con una "Prossima azione concreta"
          `,
        },
        {
          role: "user",
          content: `
Mood: ${mood}
Energia: ${energy}/10
Focus principale: ${mainFocus}
Blocco: ${blocker}
Nota libera: ${note}
          `,
        },
      ],
    });

    return (
      completion.choices[0].message.content ||
      `Oggi concentrati su ${mainFocus}. Evita il blocco: ${blocker}.`
    );
  } catch (error) {
    console.log("DAILY CHECKIN AI ERROR:", error);

    return `Oggi concentrati su ${mainFocus}. Il blocco principale da gestire è: ${blocker}. Prossima azione concreta: lavora 25 minuti sulla cosa più importante.`;
  }
}

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return Response.json(
        {
          error: "Utente non autorizzato",
        },
        { status: 401 }
      );
    }

    const today = getLocalDateString();

    const { data: checkin } = await supabaseAdmin
      .from("daily_checkins")
      .select("*")
      .eq("user_id", user.id)
      .eq("checkin_date", today)
      .maybeSingle();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select(
        "brain_score, current_streak, longest_streak, last_checkin_date, plan, subscription_status"
      )
      .eq("id", user.id)
      .maybeSingle();

    const { data: recentCheckins } = await supabaseAdmin
      .from("daily_checkins")
      .select("*")
      .eq("user_id", user.id)
      .order("checkin_date", { ascending: false })
      .limit(7);

    return Response.json({
      today,
      checkin,
      profile: profile || {
        brain_score: 0,
        current_streak: 0,
        longest_streak: 0,
        last_checkin_date: null,
      },
      recentCheckins: recentCheckins || [],
    });
  } catch (error: any) {
    console.log("DAILY CHECKIN GET ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore caricamento check-in",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return Response.json(
        {
          error: "Utente non autorizzato",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const today = body.checkin_date || getLocalDateString();

    const mood = String(body.mood || "").trim();
    const energy = Number(body.energy || 5);
    const mainFocus = String(body.main_focus || "").trim();
    const blocker = String(body.blocker || "").trim();
    const note = String(body.note || "").trim();

    if (!mood || !mainFocus || !blocker) {
      return Response.json(
        {
          error: "Compila mood, focus principale e blocco.",
        },
        { status: 400 }
      );
    }

    const { data: existingCheckin } = await supabaseAdmin
      .from("daily_checkins")
      .select("*")
      .eq("user_id", user.id)
      .eq("checkin_date", today)
      .maybeSingle();

    const isFirstCheckinToday = !existingCheckin;

    const aiReflection = await generateAIReflection({
      mood,
      energy,
      mainFocus,
      blocker,
      note,
    });

    const xpToAward = isFirstCheckinToday ? 20 : existingCheckin.xp_awarded || 0;

    const { data: savedCheckin, error: saveError } = await supabaseAdmin
      .from("daily_checkins")
      .upsert(
        {
          user_id: user.id,
          checkin_date: today,
          mood,
          energy,
          main_focus: mainFocus,
          blocker,
          note,
          ai_reflection: aiReflection,
          xp_awarded: xpToAward,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,checkin_date",
        }
      )
      .select()
      .single();

    if (saveError) {
      return Response.json(
        {
          error: saveError.message,
        },
        { status: 500 }
      );
    }

    if (isFirstCheckinToday) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select(
          "brain_score, current_streak, longest_streak, last_checkin_date"
        )
        .eq("id", user.id)
        .maybeSingle();

      const lastCheckinDate = profile?.last_checkin_date || null;
      const yesterday = addDays(today, -1);

      const oldScore = profile?.brain_score || 0;
      const oldCurrentStreak = profile?.current_streak || 0;
      const oldLongestStreak = profile?.longest_streak || 0;

      const newCurrentStreak =
        lastCheckinDate === yesterday ? oldCurrentStreak + 1 : 1;

      const newLongestStreak = Math.max(
        oldLongestStreak,
        newCurrentStreak
      );

      await supabaseAdmin
        .from("profiles")
        .update({
          brain_score: oldScore + 20,
          current_streak: newCurrentStreak,
          longest_streak: newLongestStreak,
          last_checkin_date: today,
        })
        .eq("id", user.id);

      await supabaseAdmin.from("brain_activity").insert({
        user_id: user.id,
        type: "daily_checkin",
        title: "Daily Brain Check-in completato",
        xp: 20,
      });

      await supabaseAdmin.from("memories").insert({
        user_id: user.id,
        title: `Daily Check-in - ${today}`,
        content: `
Mood: ${mood}
Energia: ${energy}/10
Focus principale: ${mainFocus}
Blocco da superare: ${blocker}
Nota: ${note || "Nessuna nota"}

Riflessione AI:
${aiReflection}
        `.trim(),
        category: "Check-in",
        summary: aiReflection,
        keywords: ["daily", "checkin", "focus", mood],
      });
    }

    const { data: updatedProfile } = await supabaseAdmin
      .from("profiles")
      .select(
        "brain_score, current_streak, longest_streak, last_checkin_date"
      )
      .eq("id", user.id)
      .maybeSingle();

    return Response.json({
      checkin: savedCheckin,
      profile: updatedProfile,
      awardedXp: isFirstCheckinToday ? 20 : 0,
    });
  } catch (error: any) {
    console.log("DAILY CHECKIN POST ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore salvataggio check-in",
      },
      { status: 500 }
    );
  }
}