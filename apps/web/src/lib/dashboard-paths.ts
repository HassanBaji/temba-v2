const PLAYER_PROFILE = /^\/dashboard\/players\/[^/]+\/?$/;
const PLAYER_MATCHES = /^\/dashboard\/players\/([^/]+)\/matches\/?$/;

export function playerProfilePath(userId: string) {
  return `/dashboard/players/${userId}`;
}

/** The Last 10 page, opened on one Match's sheet when `matchId` is given. */
export function playerMatchesPath(userId: string, matchId?: string) {
  const path = `${playerProfilePath(userId)}/matches`;
  return matchId ? `${path}?match=${matchId}` : path;
}

export function titleFromPath(pathname: string) {
  if (pathname === "/dashboard") {
    return "Home";
  }
  if (PLAYER_MATCHES.test(pathname)) {
    return "Last 10 games";
  }
  if (pathname.startsWith("/dashboard/players/")) {
    return "Player";
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
  if (pathname.startsWith("/dashboard/notifications")) {
    return "Notifications";
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

/** Mirrors the pages that pass `hideMobileTopBar` to `DashboardShell`. */
export function pageHidesMobileTopBar(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname === "/dashboard/you" ||
    pathname.startsWith("/dashboard/you/") ||
    pathname.startsWith("/dashboard/games/new") ||
    PLAYER_PROFILE.test(pathname) ||
    /^\/dashboard\/groups\/(?!new$)[^/]+/.test(pathname)
  );
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
  if (pathname.startsWith("/dashboard/notifications")) {
    return "/dashboard";
  }
  const playerMatches = PLAYER_MATCHES.exec(pathname);
  if (playerMatches?.[1]) {
    return playerProfilePath(playerMatches[1]);
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
