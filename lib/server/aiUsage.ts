import { createClient } from "@supabase/supabase-js";
import { FREE_LIMITS, isProPlan } from "@/lib/planLimits";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.log("MISSING NEXT_PUBLIC_SUPABASE_URL");
}

if (!serviceRoleKey) {
  console.log("MISSING SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(
  supabaseUrl || "",
  serviceRoleKey || ""
);

export type AIUsageType = "chat" | "focus" | "goals";

function getMonthStart() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();
}

function getLimitByType(type: AIUsageType) {
  if (type === "chat") {
    return FREE_LIMITS.chatMessagesPerMonth;
  }

  if (type === "focus") {
    return FREE_LIMITS.focusPerMonth;
  }

  if (type === "goals") {
    return FREE_LIMITS.goalStrategiesPerMonth;
  }

  return 0;
}

function getLabelByType(type: AIUsageType) {
  if (type === "chat") {
    return "messaggi Chat AI";
  }

  if (type === "focus") {
    return "generazioni Focus AI";
  }

  if (type === "goals") {
    return "strategie Goals AI";
  }

  return "azioni AI";
}

export async function checkAIUsage(
  userId: string,
  type: AIUsageType
) {
  if (!userId) {
    return {
      allowed: false,
      isPro: false,
      used: 0,
      limit: getLimitByType(type),
      message: "Utente mancante.",
    };
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("plan, subscription_status")
      .eq("id", userId)
      .single();

  if (profileError) {
    console.log("PLAN CHECK ERROR:", profileError);
  }

  const plan = profile?.plan || "free";
  const status =
    profile?.subscription_status || "inactive";

  const isPro = isProPlan(plan, status);

  if (isPro) {
    return {
      allowed: true,
      isPro: true,
      used: 0,
      limit: null,
      message: "",
    };
  }

  const limit = getLimitByType(type);
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
    console.log("AI USAGE COUNT ERROR:", error);
  }

  const used = count || 0;

  if (used >= limit) {
    return {
      allowed: false,
      isPro: false,
      used,
      limit,
      message: `Hai raggiunto il limite Free di ${limit} ${getLabelByType(
        type
      )} al mese. Passa a Pro per continuare senza limiti.`,
    };
  }

  return {
    allowed: true,
    isPro: false,
    used,
    limit,
    message: "",
  };
}

export async function recordAIUsage(
  userId: string,
  type: AIUsageType
) {
  if (!userId) return;

  const { error } = await supabaseAdmin
    .from("ai_usage")
    .insert({
      user_id: userId,
      type,
    });

  if (error) {
    console.log("AI USAGE INSERT ERROR:", error);
  }
}