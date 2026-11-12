import { challengesTabQuery } from "@repo/domain/challenges-tab";
import { gamesHubTabQuery } from "@repo/domain/games-hub-tab";
import {
  notificationCopy,
  type NotificationTitlePart,
} from "@repo/domain/notification-copy";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { NotificationItem } from "#src/notifications/load-notification-items";

export type NotificationEmailInput = Pick<
  NotificationItem,
  | "type"
  | "audience"
  | "viaWaitlist"
  | "gameCount"
  | "actor"
  | "partner"
  | "team"
  | "group"
  | "challenge"
  | "game"
  | "levelSet"
  | "tier"
>;

export type NotificationEmail = { subject: string; html: string; text: string };

type Destination = {
  kind: "game" | "group" | "history" | "teams" | "challenges";
  path: string;
};

const SETTINGS_PATH = "/dashboard/you/settings";

const INK = "#000000";
const PAPER = "#ffffff";
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * The Web App page for a Notification, repeated here because `@repo/domain`
 * holds no route strings. Keep in step with `apps/web/src/lib/notification-href.ts`.
 */
export function notificationEmailDestination(
  item: Pick<NotificationEmailInput, "type" | "group" | "game"> & {
    challenge?: { id: string } | null;
  },
): Destination | null {
  if (item.type === "performance_ratings_open" && item.game) {
    return { kind: "game", path: `/dashboard/games/${item.game.id}/rate` };
  }
  if (
    (item.type === "group_member_joined" ||
      item.type === "level_set" ||
      item.type === "tier_points_adjusted" ||
      item.type === "tier_band_changed" ||
      ((item.type === "group_join_requested" ||
        item.type === "group_join_approved" ||
        item.type === "group_join_declined") &&
        !item.game)) &&
    item.group
  ) {
    return { kind: "group", path: `/dashboard/groups/${item.group.id}` };
  }
  if (
    (item.type === "game_player_joined" ||
      item.type === "game_player_left" ||
      item.type === "game_seated_by_organizer" ||
      item.type === "game_side_changed" ||
      item.type === "game_moved_to_waitlist" ||
      item.type === "match_score_to_confirm" ||
      item.type === "game_finished" ||
      item.type === "mark_received" ||
      item.type === "mvp_decided" ||
      item.type === "mvp_tie_break" ||
      item.type === "performance_ratings_closed" ||
      item.type === "group_join_requested" ||
      item.type === "group_join_approved" ||
      item.type === "group_join_declined" ||
      item.type === "game_level_range_requested" ||
      item.type === "game_level_range_approved" ||
      item.type === "game_level_range_declined" ||
      item.type === "challenge_proposal_confirmed" ||
      item.type === "challenge_squad_due" ||
      item.type === "challenge_squad_named") &&
    item.game
  ) {
    return { kind: "game", path: `/dashboard/games/${item.game.id}` };
  }
  if (item.type === "team_invite_received") {
    return {
      kind: "teams",
      path: `/dashboard/challenges${challengesTabQuery("teams")}`,
    };
  }
  if (
    (item.type === "challenge_proposal_received" ||
      item.type === "challenge_proposal_declined" ||
      item.type === "challenge_proposal_expired" ||
      item.type === "challenge_proposal_passed_over" ||
      item.type === "challenge_rematch_nudge") &&
    item.challenge
  ) {
    return {
      kind: "challenges",
      path: `/dashboard/challenges/${item.challenge.id}`,
    };
  }
  if (item.type === "challenge_expired") {
    return {
      kind: "challenges",
      path: `/dashboard/challenges${challengesTabQuery("mine")}`,
    };
  }
  if (item.type === "history_linked") {
    return {
      kind: "history",
      path: `/dashboard/games${gamesHubTabQuery("history")}`,
    };
  }
  return null;
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function titleText(parts: NotificationTitlePart[]) {
  return parts.map((part) => part.text).join("");
}

function titleHtml(parts: NotificationTitlePart[]) {
  return parts
    .map((part) =>
      part.strong
        ? `<strong>${escapeHtml(part.text)}</strong>`
        : escapeHtml(part.text),
    )
    .join("");
}

function paragraph(html: string, style = "") {
  return `<p style="margin:0 0 8px;${style}">${html}</p>`;
}

/** Null for a Notification the Web App itself would not show: unknown copy or no page to open. */
export function renderNotificationEmail(
  item: NotificationEmailInput,
  locale: Locale,
  webOrigin: string,
): NotificationEmail | null {
  const copy = notificationCopy(item, locale);
  const destination = notificationEmailDestination(item);
  if (!copy || !destination) {
    return null;
  }
  const m = messagesFor(locale);
  const subject = titleText(copy.title);
  const groupLine =
    item.game && item.group?.name
      ? m.email.inGroup(m.common.isolate(item.group.name))
      : null;
  const button = m.email.open[destination.kind];
  const href = `${webOrigin}${destination.path}`;
  const settingsHref = `${webOrigin}${SETTINGS_PATH}`;
  const rtl = locale === "ar";
  const align = rtl ? "right" : "left";

  const body = [
    paragraph(titleHtml(copy.title), "font-size:18px;line-height:26px;"),
    copy.subline ? paragraph(escapeHtml(copy.subline)) : "",
    groupLine ? paragraph(escapeHtml(groupLine)) : "",
  ].join("");

  const html = `<!doctype html>
<html lang="${locale}" dir="${rtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};color:${INK};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;border:1px solid ${INK};font-family:${FONT};font-size:16px;line-height:24px;color:${INK};text-align:${align};">
<tr><td style="padding:16px 24px;border-bottom:1px solid ${INK};font-size:14px;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(m.common.appName)}</td></tr>
<tr><td style="padding:24px 24px 16px;">${body}</td></tr>
<tr><td style="padding:0 24px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border:1px solid ${INK};background:${INK};"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;color:${PAPER};text-decoration:none;font-weight:600;">${escapeHtml(button)}</a></td></tr></table>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid ${INK};font-size:13px;line-height:20px;">${escapeHtml(m.email.footer.why)} <a href="${escapeHtml(settingsHref)}" style="color:${INK};">${escapeHtml(m.email.footer.settings)}</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    subject,
    copy.subline,
    groupLine,
    "",
    `${button}: ${href}`,
    "",
    m.email.footer.why,
    `${m.email.footer.settings}: ${settingsHref}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return { subject, html, text };
}
