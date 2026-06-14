import { createClient } from "@supabase/supabase-js";
import { getBrainLevel, getLevelProgress } from "@/lib/brainLevels";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

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

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select(
        "brain_score, current_streak, longest_streak, last_checkin_date"
      )
      .eq("id", user.id)
      .maybeSingle();

    const brainScore = profile?.brain_score || 0;
    const brainLevel = getBrainLevel(brainScore);
    const levelProgress = getLevelProgress(brainScore);

    const { data: activities } = await supabaseAdmin
      .from("brain_activity")
      .select("id, type, title, xp, created_at")
      .eq("user_id", user.id)
      .order("id", { ascending: false })
      .limit(10);

    return Response.json({
      brainScore,
      currentStreak: profile?.current_streak || 0,
      longestStreak: profile?.longest_streak || 0,
      lastCheckinDate: profile?.last_checkin_date || null,
      brainLevel,
      levelProgress,
      activities: activities || [],
    });
  } catch (error: any) {
    console.log("BRAIN XP GET ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore caricamento XP",
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

    const type = String(body.type || "activity");
    const title = String(body.title || "Attività iMemory");
    const xp = Math.max(Number(body.xp || 0), 0);
    const dedupeKey = body.dedupe_key ? String(body.dedupe_key) : null;
    const metadata = body.metadata || {};

    if (xp <= 0) {
      return Response.json(
        {
          error: "XP non validi",
        },
        { status: 400 }
      );
    }

    if (dedupeKey) {
      const { data: existing } = await supabaseAdmin
        .from("brain_activity")
        .select("id")
        .eq("user_id", user.id)
        .eq("dedupe_key", dedupeKey)
        .maybeSingle();

      if (existing) {
        return Response.json({
          awarded: false,
          alreadyAwarded: true,
          message: "XP già assegnati per questa azione.",
        });
      }
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("brain_score")
      .eq("id", user.id)
      .maybeSingle();

    const oldScore = profile?.brain_score || 0;
    const newScore = oldScore + xp;

    const { error: activityError } = await supabaseAdmin
      .from("brain_activity")
      .insert({
        user_id: user.id,
        type,
        title,
        xp,
        metadata,
        dedupe_key: dedupeKey,
      });

    if (activityError) {
      console.log("BRAIN ACTIVITY INSERT ERROR:", activityError);

      return Response.json(
        {
          error: activityError.message,
        },
        { status: 500 }
      );
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        brain_score: newScore,
      })
      .eq("id", user.id);

    if (profileError) {
      console.log("BRAIN SCORE UPDATE ERROR:", profileError);

      return Response.json(
        {
          error: profileError.message,
        },
        { status: 500 }
      );
    }

    const brainLevel = getBrainLevel(newScore);
    const levelProgress = getLevelProgress(newScore);

    return Response.json({
      awarded: true,
      xp,
      oldScore,
      newScore,
      brainLevel,
      levelProgress,
    });
  } catch (error: any) {
    console.log("BRAIN XP POST ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore assegnazione XP",
      },
      { status: 500 }
    );
  }
}