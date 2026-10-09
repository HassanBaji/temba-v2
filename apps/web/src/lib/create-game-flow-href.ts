import {
  createGameFlowTarget,
  type CreateGameFlowTarget,
} from "@repo/domain/create-game-flow";

export function createGameFlowHref(input: Partial<CreateGameFlowTarget>) {
  const target = createGameFlowTarget(input);
  const params = new URLSearchParams();
  if (target.groupId) {
    params.set("groupId", target.groupId);
  }
  if (target.type) {
    params.set("type", target.type);
  }
  if (target.step) {
    params.set("step", String(target.step));
  }
  const query = params.toString();
  return query.length > 0
    ? `/dashboard/games/new?${query}`
    : "/dashboard/games/new";
}
