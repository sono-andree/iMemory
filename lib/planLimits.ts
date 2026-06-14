export const FREE_LIMITS = {
  memories: 1,
  goals: 1,
  focusPerMonth: 1,
  chatMessagesPerMonth: 1,
  goalStrategiesPerMonth: 1,
};

export function isProPlan(
  plan?: string | null,
  status?: string | null
) {
  return plan === "pro" && status === "active";
}