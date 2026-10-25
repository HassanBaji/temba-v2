export type HomeNoGamesCreateAction =
  | { kind: "group"; target: { kind: "create-group" }; label: string }
  | { kind: "game"; target: { kind: "create-game" }; label: string };

export function homeNoGamesCreateAction(input: {
  createGroupCount: number | undefined;
}): HomeNoGamesCreateAction {
  if (input.createGroupCount === 0) {
    return {
      kind: "group",
      target: { kind: "create-group" },
      label: "Create Group",
    };
  }
  return { kind: "game", target: { kind: "create-game" }, label: "Create" };
}

export function homeNoGamesCopy(
  createAction: HomeNoGamesCreateAction | null,
): string {
  return createAction?.kind === "group"
    ? "Create a Group first, then you can create a Game."
    : "Browse available games.";
}
