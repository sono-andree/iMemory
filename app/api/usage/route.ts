import { createClient } from "@supabase/supabase-js";
import { FREE_LIMITS, isProPlan } from "@/lib/planLimits";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

function getMonthStart() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();
}

async function countAIUsage(userId: string, type: string) {
  const monthStart = getMonthStart();

  const { count, error } = await supabaseAdmin
    .from("ai_usage")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId)
    .eq("type", type)
    .gte("created_at", monthStart);

  if (error) {
    console.log(`USAGE COUNT ERROR ${type}:`, error);
  }

  return count || 0;
}

async function countTable(
  table: string,
  userId: string
) {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId);

  if (error) {
    console.log(`COUNT ERROR ${table}:`, error);
  }

  return count || 0;
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return Response.json(
        {
          error: "Token mancante",
        },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return Response.json(
        {
          error: "Utente non autorizzato",
        },
        { status: 401 }
      );
    }

    const userId = user.id;

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("plan, subscription_status")
        .eq("id", userId)
        .single();

    if (profileError) {
      console.log("USAGE PROFILE ERROR:", profileError);
    }

    const plan = profile?.plan || "free";
    const subscriptionStatus =
      profile?.subscription_status || "inactive";

    const isPro = isProPlan(plan, subscriptionStatus);

    const [
      chatUsed,
      focusUsed,
      goalsAIUsed,
      memoriesCount,
      goalsCount,
    ] = await Promise.all([
      countAIUsage(userId, "chat"),
      countAIUsage(userId, "focus"),
      countAIUsage(userId, "goals"),
      countTable("memories", userId),
      countTable("goals", userId),
    ]);

    return Response.json({
      plan,
      subscriptionStatus,
      isPro,
      limits: FREE_LIMITS,
      usage: {
        chat: chatUsed,
        focus: focusUsed,
        goalsAI: goalsAIUsed,
        memories: memoriesCount,
        goals: goalsCount,
      },
    });
  } catch (error: any) {
    console.log("USAGE API ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore usage API",
      },
      { status: 500 }
    );
  }
}