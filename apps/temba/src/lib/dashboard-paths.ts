export function titleFromPath(pathname: string) {
  if (pathname === "/dashboard") {
    return "Home";
  }
  if (pathname.startsWith("/dashboard/you/settings")) {
    return "Settings";
  }
  if (pathname.startsWith("/dashboard/you")) {
    return "Profile";
  }
  if (pathname.startsWith("/dashboard/invites")) {
    return "Invites";
  }
  if (pathname.startsWith("/dashboard/groups/new")) {
    return "Create Group";
  }
  if (pathname.startsWith("/dashboard/communities/new")) {
    return "Create Community";
  }
  if (pathname.startsWith("/dashboard/teams/new")) {
    return "Create Team";
  }
  if (pathname.startsWith("/dashboard/venues/new")) {
    return "Create Venue";
  }
  if (pathname.startsWith("/dashboard/games/new")) {
    return "Create Game";
  }
  if (pathname.startsWith("/dashboard/groups/")) {
    return "Group";
  }
  if (pathname.startsWith("/dashboard/communities/")) {
    return "Community";
  }
  if (pathname.startsWith("/dashboard/teams/")) {
    return "Team";
  }
  if (pathname.startsWith("/dashboard/venues/")) {
    return "Venue";
  }
  if (pathname.startsWith("/dashboard/games/")) {
    return "Game";
  }
  if (pathname.startsWith("/dashboard/groups")) {
    return "Groups";
  }
  if (pathname.startsWith("/dashboard/communities")) {
    return "Communities";
  }
  if (pathname.startsWith("/dashboard/teams")) {
    return "My Teams";
  }
  if (pathname.startsWith("/dashboard/venues")) {
    return "Venues";
  }
  if (pathname.startsWith("/dashboard/games")) {
    return "Games";
  }
  return "Home";
}

export function detailBackHref(
  pathname: string | null,
  hasCreateAccess = false,
): string | undefined {
  if (!pathname) {
    return undefined;
  }
  if (pathname.startsWith("/dashboard/you/settings")) {
    return "/dashboard/you";
  }
  if (/^\/dashboard\/groups\/(?!new$)[^/]+/.test(pathname)) {
    return "/dashboard/groups";
  }
  if (/^\/dashboard\/communities\/(?!new$)[^/]+/.test(pathname)) {
    return hasCreateAccess ? "/dashboard/communities" : "/dashboard";
  }
  if (/^\/dashboard\/teams\/(?!new$)[^/]+/.test(pathname)) {
    return "/dashboard/teams";
  }
  if (/^\/dashboard\/venues\/(?!new$)[^/]+/.test(pathname)) {
    return "/dashboard/venues";
  }
  if (/^\/dashboard\/games\/(?!new$)[^/]+/.test(pathname)) {
    return "/dashboard/games";
  }
  return undefined;
}
