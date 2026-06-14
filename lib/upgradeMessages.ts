export function getUpgradeTitle(feature: string) {
  if (feature === "chat") return "Chat AI Free terminata";
  if (feature === "focus") return "Focus AI Free terminato";
  if (feature === "goals-ai") return "Strategie Goals Free terminate";
  if (feature === "memories") return "Limite memorie raggiunto";
  if (feature === "goals") return "Limite goals raggiunto";

  return "Limite Free raggiunto";
}

export function getUpgradeFeatureLabel(feature: string) {
  if (feature === "chat") return "Chat AI";
  if (feature === "focus") return "Focus AI";
  if (feature === "goals-ai") return "Goals AI";
  if (feature === "memories") return "Memorie";
  if (feature === "goals") return "Goals";

  return "iMemory";
}