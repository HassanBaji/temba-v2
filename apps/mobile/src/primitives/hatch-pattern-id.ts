export function hatchPatternId(instanceId: string): string {
  return `hatch-${instanceId.replace(/[^a-zA-Z0-9]/g, "")}`;
}
