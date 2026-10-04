export const REMOTE_ROUTERS: readonly string[] = [
  "venues",
  "teams",
  "communities",
  "groups",
  "ratings",
  "users",
  "games",
];

export function isRemoteProcedure(
  path: string,
  remoteRouters: readonly string[] = REMOTE_ROUTERS,
) {
  return remoteRouters.includes(path.split(".")[0] ?? "");
}
