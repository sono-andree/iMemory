export const FREE_LIMITS = {
  memories: 50,
  goals: 3,
  focusPerMonth: 5,
  chatMessagesPerMonth: 30,
  goalStrategiesPerMonth: 10,
};

export function isProPlan(
  plan?: string | null,
  status?: string | null
) {
  return plan === "pro" && status === "active";
}
