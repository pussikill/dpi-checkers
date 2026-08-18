export const classifyTcp1620 = (alive, largePost) => {
  if (alive === "no") return "skip";
  if (largePost === "no" && alive === "yes") return "detected";
  if (largePost === "no") return "probably";
  if (largePost === "unknown" && alive === "yes") return "possible";
  if (largePost === "unknown") return "inconclusive";
  return "not detected";
};

export const compareProbe = (baseline, current) => {
  if (baseline !== "yes") return "not testable";
  if (current === "yes") return "available";
  if (current === "no") return "blocked";
  return "unavailable";
};
