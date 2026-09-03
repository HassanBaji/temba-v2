export function gameHomeTabFromQuery(tab: string | null | undefined) {
  return tab === "results" ? "results" : "overview";
}
