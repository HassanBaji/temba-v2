export type HomeNoGamesCreateAction = {
  kind: "game" | "group";
  href: string;
  label: string;
};

export function homeNoGamesCreateAction(input: {
  hasCreateAccess: boolean;
  createGroupCount: number | undefined;
}): HomeNoGamesCreateAction | null {
  if (!input.hasCreateAccess) {
    return null;
  }
  if (input.createGroupCount === 0) {
    return {
      kind: "group",
      href: "/dashboard/groups/new",
      label: "Create Group",
    };
  }
  return {
    kind: "game",
    href: "/dashboard/games/new",
    label: "Create Game",
  };
}
