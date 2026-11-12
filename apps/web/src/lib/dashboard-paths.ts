import { challengesTabQuery } from "@repo/domain/challenges-tab";
import { isCoinKind, type CoinKind } from "@repo/domain/marks";
import type { Sport } from "@repo/domain/sport";
import type { Messages } from "@repo/i18n/messages";

const PLAYER_PROFILE = /^\/dashboard\/players\/[^/]+\/?$/;
const PLAYER_MATCHES = /^\/dashboard\/players\/([^/]+)\/matches\/?$/;
const PLAYER_MARKS = /^\/dashboard\/players\/([^/]+)\/marks\/?$/;
const PLAYER_MARK = /^\/dashboard\/players\/([^/]+)\/marks\/([^/]+)\/?$/;

const YOU_RATINGS_HREF = "/dashboard/you/ratings";

/** Ratings (screens 1a, 1b), opened on `sport`. */
export function youRatingsHref(sport: Sport) {
  return `${YOU_RATINGS_HREF}?sport=${sport}`;
}

/** The Player profile, opened on `sport` when given. */
export function playerProfilePath(userId: string, sport?: Sport) {
  const path = `/dashboard/players/${userId}`;
  return sport ? `${path}?sport=${sport}` : path;
}

/** The Last 10 page, opened on one Match's sheet when `matchId` is given. */
export function playerMatchesPath(userId: string, matchId?: string) {
  const path = `/dashboard/players/${userId}/matches`;
  return matchId ? `${path}?match=${matchId}` : path;
}

/** All marks (3a), opened on one sport's tab when given. */
export function playerMarksPath(userId: string, sport?: Sport) {
  const path = `/dashboard/players/${userId}/marks`;
  return sport ? `${path}?sport=${sport}` : path;
}

/** One kind's detail (3b) on one sport's tab. */
export function playerMarkPath(userId: string, kind: CoinKind, sport: Sport) {
  return `/dashboard/players/${userId}/marks/${kind}?sport=${sport}`;
}

export function titleFromPath(pathname: string, m: Messages) {
  const titles = m.webUi.pageTitle;
  if (pathname === "/dashboard") {
    return m.common.home;
  }
  if (PLAYER_MATCHES.test(pathname)) {
    return titles.lastTenGames;
  }
  const kind = PLAYER_MARK.exec(pathname)?.[2];
  if (kind !== undefined) {
    return isCoinKind(kind) ? m.marks.kind[kind].name : m.marks.cabinet.title;
  }
  if (PLAYER_MARKS.test(pathname)) {
    return m.marks.cabinet.title;
  }
  if (pathname.startsWith("/dashboard/players/")) {
    return titles.player;
  }
  if (pathname.startsWith("/dashboard/you/settings")) {
    return m.common.settings;
  }
  if (pathname.startsWith(YOU_RATINGS_HREF)) {
    return m.rating.screen.title;
  }
  if (pathname.startsWith("/dashboard/you")) {
    return m.common.profile;
  }
  if (pathname.startsWith("/dashboard/invites")) {
    return m.common.invites;
  }
  if (pathname.startsWith("/dashboard/notifications")) {
    return m.common.notifications;
  }
  if (pathname.startsWith("/dashboard/operator/groups")) {
    return m.webUi.nav.verifyGroups;
  }
  if (pathname.startsWith(OPERATOR_DISPUTES_HREF)) {
    return m.rating.dispute.operator.title;
  }
  if (pathname.startsWith("/dashboard/groups/new")) {
    return titles.createGroup;
  }
  if (pathname.startsWith("/dashboard/teams/new")) {
    return titles.createTeam;
  }
  if (pathname.startsWith("/dashboard/venues/new")) {
    return titles.createVenue;
  }
  if (pathname.startsWith("/dashboard/games/new")) {
    return titles.createGame;
  }
  if (/^\/dashboard\/groups\/[^/]+\/seasons\/new/.test(pathname)) {
    return titles.newSeason;
  }
  if (/^\/dashboard\/groups\/[^/]+\/edit/.test(pathname)) {
    return titles.editGroup;
  }
  if (/^\/dashboard\/groups\/[^/]+\/seasons/.test(pathname)) {
    return titles.seasons;
  }
  if (pathname.startsWith("/dashboard/groups/")) {
    return titles.group;
  }
  if (pathname.startsWith("/dashboard/teams/")) {
    return titles.team;
  }
  if (pathname.startsWith("/dashboard/venues/")) {
    return titles.venue;
  }
  if (pathname.startsWith("/dashboard/games/")) {
    return titles.game;
  }
  if (pathname.startsWith("/dashboard/groups")) {
    return m.common.groups;
  }
  if (pathname.startsWith("/dashboard/teams")) {
    return titles.myTeams;
  }
  if (pathname.startsWith("/dashboard/challenges")) {
    return m.common.challenges;
  }
  if (pathname.startsWith("/dashboard/venues")) {
    return m.webUi.nav.venues;
  }
  if (pathname.startsWith("/dashboard/games")) {
    return m.common.games;
  }
  return m.common.home;
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

export function detailBackHref(pathname: string | null): string | undefined {
  if (!pathname) {
    return undefined;
  }
  if (
    pathname.startsWith("/dashboard/you/settings") ||
    pathname.startsWith(YOU_RATINGS_HREF)
  ) {
    return "/dashboard/you";
  }
  if (pathname.startsWith("/dashboard/notifications")) {
    return "/dashboard";
  }
  const playerMatches = PLAYER_MATCHES.exec(pathname);
  if (playerMatches?.[1]) {
    return playerProfilePath(playerMatches[1]);
  }
  const playerMark = PLAYER_MARK.exec(pathname);
  if (playerMark?.[1]) {
    return playerMarksPath(playerMark[1]);
  }
  const playerMarks = PLAYER_MARKS.exec(pathname);
  if (playerMarks?.[1]) {
    return playerProfilePath(playerMarks[1]);
  }
  if (/^\/dashboard\/groups\/(?!new$)[^/]+/.test(pathname)) {
    return "/dashboard/groups";
  }
  if (/^\/dashboard\/teams\/(?!new$)[^/]+/.test(pathname)) {
    return `/dashboard/challenges${challengesTabQuery("teams")}`;
  }
  if (/^\/dashboard\/venues\/(?!new$)[^/]+/.test(pathname)) {
    return "/dashboard/venues";
  }
  if (/^\/dashboard\/games\/(?!new$)[^/]+/.test(pathname)) {
    return "/dashboard/games";
  }
  return undefined;
}

export function gameHomeHref(gameId: string) {
  return `/dashboard/games/${gameId}`;
}

/** The Operator's open Match disputes. */
export const OPERATOR_DISPUTES_HREF = "/dashboard/operator/disputes";

/** Rate the game (screen 4a). */
export function gameRateHref(gameId: string) {
  return `/dashboard/games/${gameId}/rate`;
}

/** The Organizer's ratings summary (screen 4d). */
export function gameRatingSummaryHref(gameId: string) {
  return `/dashboard/games/${gameId}/ratings`;
}

export function groupSeasonsHref(groupId: string) {
  return `/dashboard/groups/${groupId}/seasons`;
}

export function groupEditHref(groupId: string) {
  return `/dashboard/groups/${groupId}/edit`;
}

export function groupHomeHref(groupId: string) {
  return `/dashboard/groups/${groupId}`;
}

/** Rating settings of a tier Group (screen 3b). */
export function groupRatingSettingsHref(groupId: string) {
  return `/dashboard/groups/${groupId}/rating-settings`;
}

export function groupNewSeasonHref(groupId: string) {
  return `/dashboard/groups/${groupId}/seasons/new`;
}

/** Points and history (screen 2e); without `userId`, the viewer's own. */
export function groupTierHistoryHref(groupId: string, userId?: string) {
  const path = `/dashboard/groups/${groupId}/points`;
  return userId
    ? `${path}?${new URLSearchParams({ member: userId }).toString()}`
    : path;
}

export function groupMemberSetLevelHref(groupId: string, userId: string) {
  return `/dashboard/groups/${groupId}/members/${userId}`;
}

/** `savedUserId` shows the saved banner for the member whose Level was just set. */
export function groupMembersTabHref(groupId: string, savedUserId?: string) {
  const query = new URLSearchParams({ tab: "members" });
  if (savedUserId) {
    query.set("saved", savedUserId);
  }
  return `/dashboard/groups/${groupId}?${query.toString()}`;
}
