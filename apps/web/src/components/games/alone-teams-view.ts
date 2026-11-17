import {
  alonePairAverage,
  alonePairSameSide,
  aloneTeamsSidesMatch,
  aloneTeamsSpread,
  balanceAloneTeams,
  formatAloneLevel,
  type AlonePair,
  type AlonePlayer,
  type AloneSide,
  type AloneTeamsShareTeam,
} from "@repo/domain/alone-teams";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type AloneSheetPlayer = {
  userId: string;
  name: string;
  image: string | null;
  level: number | null;
  levelBand: string | null;
  preferredSide: AloneSide | null;
};

export type AloneSheetTeam = {
  sideIndex: number | null;
  left: string | null;
  right: string | null;
};

/** How the line-up on Make teams came about, for the note under the buttons. */
export type AloneDraftMode = "balanced" | "shuffled" | "edited" | "posted";

export type AloneDraft = {
  pairs: AlonePair[];
  unplaced: string | null;
  mode: AloneDraftMode;
};

export function alonePlayers(
  players: readonly AloneSheetPlayer[],
): AlonePlayer[] {
  return players.map((player) => ({
    id: player.userId,
    level: player.level,
    preferredSide: player.preferredSide,
  }));
}

/** The posted teams, side by side, when they still place everyone but one odd player. */
function postedPairs(
  players: readonly AloneSheetPlayer[],
  teams: readonly AloneSheetTeam[],
): { pairs: AlonePair[]; unplaced: string | null } | null {
  const ids = new Set(players.map((player) => player.userId));
  const ordered = [...teams].sort(
    (first, second) => (first.sideIndex ?? 0) - (second.sideIndex ?? 0),
  );
  const pairs: AlonePair[] = [];
  for (const team of ordered) {
    if (!team.left || !team.right) {
      return null;
    }
    if (!ids.has(team.left) || !ids.has(team.right)) {
      return null;
    }
    pairs.push({ left: team.left, right: team.right });
  }
  const placed = new Set(pairs.flatMap((pair) => [pair.left, pair.right]));
  const left = players.filter((player) => !placed.has(player.userId));
  if (pairs.length === 0 || left.length > 1) {
    return null;
  }
  return { pairs, unplaced: left[0]?.userId ?? null };
}

/**
 * Make teams opens on the teams as posted, while they still hold; otherwise
 * on the balance by level.
 */
export function initialAloneDraft(sheet: {
  players: readonly AloneSheetPlayer[];
  teams: readonly AloneSheetTeam[];
  teamsPostedAt: Date | string | null;
}): AloneDraft {
  const posted =
    sheet.teamsPostedAt != null
      ? postedPairs(sheet.players, sheet.teams)
      : null;
  if (posted) {
    return { ...posted, mode: "posted" };
  }
  return {
    ...balanceAloneTeams(alonePlayers(sheet.players)),
    mode: "balanced",
  };
}

export function aloneDraftNote(
  draft: Pick<AloneDraft, "pairs" | "mode">,
  playerById: ReadonlyMap<string, AlonePlayer>,
  locale: Locale,
): string | null {
  const m = messagesFor(locale).aloneTeams.make;
  const sides = aloneTeamsSidesMatch(draft.pairs, playerById)
    ? m.sidesNote
    : null;
  switch (draft.mode) {
    case "balanced":
      return [
        m.balancedNote(aloneTeamsSpread(draft.pairs, playerById).toFixed(2)),
        sides,
      ]
        .filter(Boolean)
        .join(" ");
    case "shuffled":
      return m.shuffledNote;
    case "edited":
      return m.editedNote;
    case "posted":
      return sides;
  }
}

export function aloneSideShort(side: AloneSide | null, locale: Locale) {
  const m = messagesFor(locale).aloneTeams.make;
  if (side === "left") {
    return m.sideShortLeft;
  }
  return side === "right" ? m.sideShortRight : null;
}

export type AloneMakeTeamsSlot = {
  userId: string;
  name: string;
  /** The band, then the side asked for: "B− L". */
  meta: string;
};

export type AloneMakeTeamsRow = {
  number: string;
  left: AloneMakeTeamsSlot;
  right: AloneMakeTeamsSlot;
  average: string;
  /** "2 L" when both asked for the same side. */
  sameSide: string | null;
};

export function aloneMakeTeamsRows(
  pairs: readonly AlonePair[],
  players: readonly AloneSheetPlayer[],
  locale: Locale,
): AloneMakeTeamsRow[] {
  const m = messagesFor(locale).aloneTeams.make;
  const byId = new Map(players.map((player) => [player.userId, player]));
  const playerById = new Map(
    alonePlayers(players).map((player) => [player.id, player]),
  );
  const slot = (userId: string): AloneMakeTeamsSlot => {
    const player = byId.get(userId);
    return {
      userId,
      name: player?.name ?? "",
      meta: [
        player?.levelBand ?? null,
        aloneSideShort(player?.preferredSide ?? null, locale),
      ]
        .filter(Boolean)
        .join(" "),
    };
  };
  return pairs.map((pair, index) => {
    const same = alonePairSameSide(pair, playerById);
    return {
      number: String(index + 1).padStart(2, "0"),
      left: slot(pair.left),
      right: slot(pair.right),
      average: formatAloneLevel(
        alonePairAverage([
          byId.get(pair.left)?.level ?? null,
          byId.get(pair.right)?.level ?? null,
        ]),
        locale,
      ),
      sameSide: same ? m.sameSide(aloneSideShort(same, locale) ?? "") : null,
    };
  });
}

/** The posted teams with full names, in side order, for Share teams; Half teams are left out. */
export function aloneShareTeams(
  players: readonly AloneSheetPlayer[],
  teams: readonly AloneSheetTeam[],
): AloneTeamsShareTeam[] {
  const byId = new Map(players.map((player) => [player.userId, player]));
  return [...teams]
    .sort((first, second) => (first.sideIndex ?? 0) - (second.sideIndex ?? 0))
    .flatMap((team) => {
      const left = team.left ? byId.get(team.left) : undefined;
      const right = team.right ? byId.get(team.right) : undefined;
      if (!left || !right) {
        return [];
      }
      return [
        {
          leftName: left.name,
          rightName: right.name,
          average: alonePairAverage([left.level, right.level]),
        },
      ];
    });
}

export function alonePostedTitle(
  shape: { knockoutOnly: boolean; king: boolean },
  locale: Locale,
) {
  const m = messagesFor(locale).aloneTeams.posted;
  if (shape.king) {
    return m.organizerTitleKing;
  }
  return shape.knockoutOnly ? m.organizerTitleKnockout : m.organizerTitle;
}

type SeatOccupant = { userId: string; name: string } | null;

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** The player's card once the teams are posted: who they are with, or that they wait. */
export function alonePlayerCard(
  side: { left: SeatOccupant; right: SeatOccupant } | null,
  viewerUserId: string,
  locale: Locale,
): { title: string; body: string; partnerName: string | null } {
  const m = messagesFor(locale).aloneTeams.posted;
  if (!side) {
    return {
      title: m.playerWaitingTitle,
      body: m.playerWaitingBody,
      partnerName: null,
    };
  }
  const viewerSide: AloneSide =
    side.left?.userId === viewerUserId ? "left" : "right";
  const partner = viewerSide === "left" ? side.right : side.left;
  if (!partner) {
    return {
      title: m.playerWaitingTitle,
      body: m.playerBodyNoSide,
      partnerName: null,
    };
  }
  return {
    title: m.playerTitle(partner.name),
    body: m.playerBody(viewerSide, firstName(partner.name)),
    partnerName: partner.name,
  };
}
