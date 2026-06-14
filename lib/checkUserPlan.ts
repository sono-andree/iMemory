import { supabase } from "@/lib/supabase";
import { FREE_LIMITS, isProPlan } from "@/lib/planLimits";

export async function getUserPlan() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      plan: "free",
      subscriptionStatus: "inactive",
      isPro: false,
      limits: FREE_LIMITS,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan || "free";
  const subscriptionStatus = profile?.subscription_status || "inactive";

  return {
    user,
    plan,
    subscriptionStatus,
    isPro: isProPlan(plan, subscriptionStatus),
    limits: FREE_LIMITS,
  };
}

export async function canCreateMemory() {
  const planData = await getUserPlan();

  if (!planData.user) {
    return {
      allowed: false,
      reason: "Utente non autenticato",
    };
  }

  if (planData.isPro) {
    return {
      allowed: true,
      reason: "",
    };
  }

  const { count } = await supabase
    .from("memories")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("user_id", planData.user.id);

  if ((count || 0) >= planData.limits.memories) {
    return {
      allowed: false,
      reason:
        "Hai raggiunto il limite Free di 30 memorie. Passa a Pro per salvare memorie illimitate.",
    };
  }

  return {
    allowed: true,
    reason: "",
  };
}

export async function canCreateGoal() {
  const planData = await getUserPlan();

  if (!planData.user) {
    return {
      allowed: false,
      reason: "Utente non autenticato",
    };
  }

  if (planData.isPro) {
    return {
      allowed: true,
      reason: "",
    };
  }

  const { count } = await supabase
    .from("goals")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("user_id", planData.user.id);

  if ((count || 0) >= planData.limits.goals) {
    return {
      allowed: false,
      reason:
        "Hai raggiunto il limite Free di 3 goals. Passa a Pro per creare goals illimitati.",
    };
  }

  return {
    allowed: true,
    reason: "",
  };
}