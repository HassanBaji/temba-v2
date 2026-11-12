import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatDayMonth, formatGameDay } from "./format-game-start";
import { gameFormatLabel } from "./game-format-label";
import { groupDisplayName } from "./group-join";
import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";
import {
  levelOverrideReasonLabel,
  type LevelOverrideReason,
} from "./level-slider";
import { formatMarksClose, isMarkKind, markName } from "./marks";
import { formatTierPoints } from "./group-members-table";
import { productDaysBetween, zonedParts } from "./product-timezone";
import { isTierBand, tierBandLabel } from "./tier-bands";

export type NotificationTitlePart = { text: string; strong: boolean };

export type NotificationCopy = {
  title: NotificationTitlePart[];
  subline: string | null;
};

export type NotificationCopyInput = {
  type: string;
  audience: string;
  viaWaitlist?: boolean;
  actor: { name: string } | null;
  partner?: { name: string } | null;
  team?: { name: string | null } | null;
  group: { name: string | null } | null;
  game?: NotificationGame | null;
  gameCount?: number | null;
  levelSet?: NotificationLevelSet | null;
  tier?: NotificationTier | null;
  markKind?: string | null;
  /** The recipient is the actor, as on the MVP's own `mvp_decided` row. */
  actorIsRecipient?: boolean;
};

type NotificationLevelSet = {
  level: string;
  levelBand: LevelBand;
  reason: LevelOverrideReason | null;
};

/** The Tier event a `tier_points_adjusted` or `tier_band_changed` row is about. */
type NotificationTier = {
  bandAfter: string | null;
  pointsBefore: number;
  pointsAfter: number;
  reason: LevelOverrideReason | null;
  note: string | null;
};

type NotificationGame = {
  name: string | null;
  format: string;
  sport?: string | null;
  windowStart: Date | string | null;
  /** Set only while the Game's Marks window is open. */
  marksClosesAt?: Date | string | null;
};

const MS_PER_MINUTE = 60 * 1000;
const RELATIVE_DAYS = 7;

function strong(text: string): NotificationTitlePart {
  return { text, strong: true };
}

function userName(name: string, locale: Locale) {
  return messagesFor(locale).common.isolate(name);
}

function actorName(actor: NotificationCopyInput["actor"], locale: Locale) {
  return actor
    ? userName(actor.name, locale)
    : messagesFor(locale).common.someone;
}

function groupName(group: { name: string | null } | null, locale: Locale) {
  return group?.name != null
    ? userName(group.name, locale)
    : groupDisplayName(null, locale);
}

/** A nameless Game reads as its format and day, `Friendly game · Thu 9 Oct`. */
function notificationGameName(game: NotificationGame, locale: Locale) {
  if (game.name?.trim()) {
    return userName(game.name, locale);
  }
  const format = gameFormatLabel(game.format, locale);
  return game.windowStart
    ? messagesFor(locale).notification.gameNameWithDay(
        format,
        formatGameDay(game.windowStart, locale, { weekday: "short" }),
      )
    : format;
}

/** A named Team, else both Users of a pair or unnamed Team, else the actor. */
function joinSubject(
  item: NotificationCopyInput,
  locale: Locale,
): NotificationTitlePart[] {
  if (item.team?.name) {
    return [strong(userName(item.team.name, locale))];
  }
  if (item.partner) {
    return messagesFor(locale).notification.title.pair(
      actorName(item.actor, locale),
      userName(item.partner.name, locale),
    );
  }
  return [strong(actorName(item.actor, locale))];
}

function gameFinishedSubline(
  audience: string,
  game: NotificationGame,
  locale: Locale,
) {
  const m = messagesFor(locale).notification.subline;
  if (audience === "admin") {
    return m.everyMatchIn;
  }
  if (audience === "player") {
    return game.marksClosesAt
      ? m.marksOpen(formatMarksClose(game.marksClosesAt, locale))
      : m.seeYourResults;
  }
  return null;
}

/** Null for a `type` or `audience` this client does not know, so the row is skipped. */
export function notificationCopy(
  item: NotificationCopyInput,
  locale: Locale,
): NotificationCopy | null {
  const m = messagesFor(locale).notification.title;
  const sub = messagesFor(locale).notification.subline;
  if (item.type === "group_member_joined" && item.audience === "admin") {
    return {
      title: m.groupMemberJoined(
        actorName(item.actor, locale),
        groupName(item.group, locale),
      ),
      subline: null,
    };
  }
  if (
    item.type === "game_player_joined" &&
    item.audience === "admin" &&
    item.game
  ) {
    const subject = joinSubject(item, locale);
    const game = notificationGameName(item.game, locale);
    return {
      title: item.viaWaitlist
        ? m.gamePlayerJoinedViaWaitlist(subject, game)
        : m.gamePlayerJoined(subject, game),
      subline: null,
    };
  }
  if (
    item.type === "game_player_left" &&
    item.audience === "admin" &&
    item.game
  ) {
    const actor = actorName(item.actor, locale);
    const game = notificationGameName(item.game, locale);
    return {
      title: item.partner
        ? m.gamePlayerLeftWithPartner(
            actor,
            game,
            userName(item.partner.name, locale),
          )
        : m.gamePlayerLeft(actor, game),
      subline: null,
    };
  }
  if (item.type === "match_score_to_confirm" && item.game) {
    return {
      title: m.matchScoreToConfirm(
        actorName(item.actor, locale),
        notificationGameName(item.game, locale),
      ),
      subline: null,
    };
  }
  if (
    item.type === "game_side_changed" &&
    item.audience === "player" &&
    item.game
  ) {
    return {
      title: m.gameSideChanged(
        actorName(item.actor, locale),
        notificationGameName(item.game, locale),
      ),
      subline: null,
    };
  }
  if (
    item.type === "game_moved_to_waitlist" &&
    item.audience === "player" &&
    item.game
  ) {
    return {
      title: m.gameMovedToWaitlist(
        actorName(item.actor, locale),
        notificationGameName(item.game, locale),
      ),
      subline: null,
    };
  }
  if (
    item.type === "game_seated_by_organizer" &&
    item.audience === "player" &&
    item.game
  ) {
    return {
      title: m.gameSeatedByOrganizer(
        actorName(item.actor, locale),
        notificationGameName(item.game, locale),
      ),
      subline: null,
    };
  }
  if (
    item.type === "history_linked" &&
    item.audience === "player" &&
    item.gameCount
  ) {
    return {
      title: m.historyLinked(item.gameCount),
      subline: null,
    };
  }
  if (
    item.type === "level_set" &&
    item.audience === "player" &&
    item.levelSet
  ) {
    const { level, levelBand, reason } = item.levelSet;
    return {
      title: m.levelSet(
        actorName(item.actor, locale),
        `${displayLabelFromStoredBand(levelBand)} ${level}`,
      ),
      subline: reason ? levelOverrideReasonLabel(reason, locale) : null,
    };
  }
  if (
    item.type === "tier_points_adjusted" &&
    item.audience === "player" &&
    item.tier?.reason
  ) {
    const { reason, note, pointsBefore, pointsAfter } = item.tier;
    const label = messagesFor(locale).rating.adjust.reasons[reason];
    const from = formatTierPoints(pointsBefore);
    const to = formatTierPoints(pointsAfter);
    return {
      title: m.tierPointsAdjusted(
        actorName(item.actor, locale),
        groupName(item.group, locale),
      ),
      subline: note
        ? sub.tierAdjustedWithNote(label, userName(note, locale), from, to)
        : sub.tierAdjusted(label, from, to),
    };
  }
  const bandAfter = item.tier?.bandAfter;
  if (
    item.type === "tier_band_changed" &&
    item.audience === "player" &&
    isTierBand(bandAfter)
  ) {
    return {
      title: m.tierBandChanged(
        tierBandLabel(bandAfter, locale),
        groupName(item.group, locale),
      ),
      subline: sub.tierPlaces,
    };
  }
  if (
    item.type === "mark_received" &&
    item.audience === "player" &&
    item.game &&
    isMarkKind(item.markKind)
  ) {
    return {
      title: m.markReceived(
        actorName(item.actor, locale),
        markName(item.markKind, locale),
        notificationGameName(item.game, locale),
      ),
      subline: null,
    };
  }
  if (item.type === "mvp_decided" && item.audience === "player" && item.game) {
    const game = notificationGameName(item.game, locale);
    return {
      title: item.actorIsRecipient
        ? m.youAreMvp(game)
        : m.mvpDecided(actorName(item.actor, locale), game),
      subline: null,
    };
  }
  if (
    item.type === "performance_ratings_open" &&
    (item.audience === "admin" || item.audience === "player") &&
    item.game
  ) {
    return {
      title: m.performanceRatingsOpen(notificationGameName(item.game, locale)),
      subline:
        item.audience === "admin" ? sub.ratingsOpen : sub.ratingsOpenEveryone,
    };
  }
  if (item.type === "mvp_tie_break" && item.audience === "admin" && item.game) {
    return {
      title: m.mvpTieBreak(notificationGameName(item.game, locale)),
      subline: null,
    };
  }
  if (item.type === "group_join_requested" && item.audience === "admin") {
    const actor = actorName(item.actor, locale);
    const group = groupName(item.group, locale);
    return item.game
      ? {
          title: m.groupJoinRequestedWithSeat(
            actor,
            group,
            notificationGameName(item.game, locale),
          ),
          subline: sub.decideOnGame,
        }
      : {
          title: m.groupJoinRequested(actor, group),
          subline: sub.decideOnGroup,
        };
  }
  if (item.type === "group_join_approved" && item.audience === "player") {
    const actor = actorName(item.actor, locale);
    const group = groupName(item.group, locale);
    return {
      title: item.game
        ? m.groupJoinApprovedWithSeat(
            actor,
            group,
            notificationGameName(item.game, locale),
          )
        : m.groupJoinApproved(actor, group),
      subline: null,
    };
  }
  if (item.type === "group_join_declined" && item.audience === "player") {
    return {
      title: m.groupJoinDeclined(
        actorName(item.actor, locale),
        groupName(item.group, locale),
      ),
      subline: null,
    };
  }
  if (
    item.type === "game_level_range_requested" &&
    item.audience === "admin" &&
    item.game
  ) {
    return {
      title: m.levelRangeRequested(
        actorName(item.actor, locale),
        notificationGameName(item.game, locale),
      ),
      subline: sub.decideOnGame,
    };
  }
  if (
    item.type === "game_level_range_approved" &&
    item.audience === "player" &&
    item.game
  ) {
    return {
      title: m.levelRangeApproved(
        actorName(item.actor, locale),
        notificationGameName(item.game, locale),
      ),
      subline: sub.takeYourSeat,
    };
  }
  if (
    item.type === "game_level_range_declined" &&
    item.audience === "player" &&
    item.game
  ) {
    return {
      title: m.levelRangeDeclined(
        actorName(item.actor, locale),
        notificationGameName(item.game, locale),
      ),
      subline: null,
    };
  }
  if (item.type === "team_invite_received" && item.audience === "player") {
    const actor = actorName(item.actor, locale);
    return {
      title: item.team?.name
        ? m.teamInviteReceived(actor, userName(item.team.name, locale))
        : m.teamInviteReceivedUnnamed(actor),
      subline: sub.acceptInTeams,
    };
  }
  if (item.type === "challenge_expired") {
    return {
      title: item.team?.name
        ? m.challengeExpired(userName(item.team.name, locale))
        : m.challengeExpiredUnnamed,
      subline: sub.postAgain,
    };
  }
  if (item.type === "challenge_proposal_received") {
    return {
      title: item.team?.name
        ? m.challengeProposalReceived(userName(item.team.name, locale))
        : m.challengeProposalReceivedUnnamed,
      subline: sub.confirmOrAnotherTime,
    };
  }
  if (item.type === "challenge_proposal_declined") {
    return {
      title: item.team?.name
        ? m.challengeProposalDeclined(userName(item.team.name, locale))
        : m.challengeProposalDeclinedUnnamed,
      subline: sub.proposeAgain,
    };
  }
  if (item.type === "challenge_proposal_expired") {
    return {
      title: item.team?.name
        ? m.challengeProposalExpired(userName(item.team.name, locale))
        : m.challengeProposalExpiredUnnamed,
      subline: sub.proposeAgain,
    };
  }
  if (item.type === "challenge_proposal_confirmed") {
    return {
      title: item.team?.name
        ? m.challengeProposalConfirmed(userName(item.team.name, locale))
        : m.challengeProposalConfirmedUnnamed,
      subline:
        item.game?.sport === "football"
          ? sub.nameYourSquad
          : sub.bothPairsSeated,
    };
  }
  if (item.type === "challenge_proposal_passed_over") {
    return {
      title: item.team?.name
        ? m.challengeProposalPassedOver(userName(item.team.name, locale))
        : m.challengeProposalPassedOverUnnamed,
      subline: sub.findAnother,
    };
  }
  if (item.type === "challenge_squad_due") {
    return {
      title: item.team?.name
        ? m.challengeSquadDue(userName(item.team.name, locale))
        : m.challengeSquadDueUnnamed,
      subline: sub.kickOffTomorrow,
    };
  }
  if (item.type === "challenge_squad_named") {
    return {
      title: item.team?.name
        ? m.challengeSquadNamed(userName(item.team.name, locale))
        : m.challengeSquadNamedUnnamed,
      subline: sub.seeWhoIsNamed,
    };
  }
  if (item.type === "challenge_rematch_nudge") {
    return {
      title: item.team?.name
        ? m.challengeRematchNudge(userName(item.team.name, locale))
        : m.challengeRematchNudgeUnnamed,
      subline: sub.acceptRematch,
    };
  }
  if (item.type === "game_finished" && item.game) {
    const subline = gameFinishedSubline(item.audience, item.game, locale);
    if (subline) {
      return {
        title: m.gameFinished(notificationGameName(item.game, locale)),
        subline,
      };
    }
  }
  return null;
}

/** Relative time, plus the Group name on a Notification about a Group Game. */
export function notificationMeta(
  item: {
    createdAt: Date | string;
    group: { name: string | null } | null;
    game?: NotificationGame | null;
  },
  locale: Locale,
  now: Date = new Date(),
) {
  const time = formatNotificationTime(item.createdAt, locale, now);
  return item.game && item.group
    ? messagesFor(locale).notification.metaWithGroup(
        time,
        groupName(item.group, locale),
      )
    : time;
}

/** `Just now`, `2 min ago`, `3 h ago`, `Yesterday`, `4 days ago`, then `3 Oct`. */
export function formatNotificationTime(
  createdAt: Date | string,
  locale: Locale,
  now: Date = new Date(),
) {
  const m = messagesFor(locale);
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const minutesAgo = Math.floor(
    (now.getTime() - date.getTime()) / MS_PER_MINUTE,
  );
  const daysAgo = productDaysBetween(date, now);
  if (daysAgo <= 0) {
    if (minutesAgo < 1) {
      return m.notification.time.justNow;
    }
    if (minutesAgo < 60) {
      return m.notification.time.minutesAgo(minutesAgo);
    }
    return m.notification.time.hoursAgo(Math.floor(minutesAgo / 60));
  }
  if (daysAgo === 1) {
    return m.common.yesterday;
  }
  if (daysAgo < RELATIVE_DAYS) {
    return m.notification.time.daysAgo(daysAgo);
  }
  return formatDayMonth(date, locale, {
    year: zonedParts(date).year !== zonedParts(now).year,
  });
}

/** The Notifications page's top row, shown only when `count > 0`. */
export function invitesWaitingLabel(count: number, locale: Locale) {
  return messagesFor(locale).notification.invitesWaiting(count);
}
