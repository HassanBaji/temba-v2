import { formatDayMonth } from "@repo/domain/format-game-start";
import {
  gameCustomName,
  gameDisplayName,
  type GameDisplayNameInput,
} from "@repo/domain/game-custom-name";
import {
  GIVER_GROUPS,
  MARK_KINDS,
  MARK_META,
  cabinetKinds,
  cabinetKindsNotYetCopy,
  cabinetLastFromCopy,
  cabinetReceivedCopy,
  markDescription,
  markName,
  markRelationCopy,
  type CoinKind,
  type GiverGroup,
  type MvpDecidedBy,
} from "@repo/domain/marks";
import { SPORTS, isSport, type Sport } from "@repo/domain/sport";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { RouterOutputs } from "../trpc/react";

type ApiCabinet = RouterOutputs["marks"]["cabinet"];
export type ShownCabinet = Extract<ApiCabinet, { hidden: false }>;
type CabinetSport = ShownCabinet["perSport"][Sport];
type CabinetKind = CabinetSport["kinds"][number];
export type KindDetail = RouterOutputs["marks"]["kindDetail"];
type KindDetailRow = KindDetail["rows"][number];

const TOP_COINS = 4;
const MVP_WAYS: readonly MvpDecidedBy[] = ["vote", "organizer", "tie_break"];

function sentences(parts: (string | null)[], locale: Locale): string {
  return messagesFor(locale).mobileMarks.sentences(
    parts.filter((part): part is string => Boolean(part)),
  );
}

function shortDay(value: Date, locale: Locale) {
  return formatDayMonth(value, locale);
}

function weekdayDay(value: Date, locale: Locale) {
  return formatDayMonth(value, locale, { weekday: "short" });
}

/**
 * What a coin's Game is called on the cabinet: the Organizer's name for it,
 * else its Group, else its window label.
 */
export function cabinetGameLabel(
  game: GameDisplayNameInput & { groupName: string | null },
  locale: Locale,
): string {
  return (
    gameCustomName(game) ?? game.groupName ?? gameDisplayName(game, locale)
  );
}

/** The requested tab when the cabinet has it, else its first. */
export function cabinetTab(
  cabinet: ShownCabinet,
  requested: string | null | undefined,
): Sport {
  if (isSport(requested) && cabinet.sports.includes(requested)) {
    return requested;
  }
  return cabinet.sports[0] ?? SPORTS[0];
}

export type CabinetRowCoin = { kind: CoinKind; name: string; count: string };

export type CabinetRowModel = {
  title: string;
  meta: string;
  coins: CabinetRowCoin[];
  /** Shown in place of the coins when nothing has been received. */
  empty: string | null;
  spoken: string;
};

/**
 * "Marks, 11 received" on a Player profile (3c, 3d): the MVP first, then the
 * most received. Absent while loading and when Match history visibility
 * hides the cabinet; the server has already left out hidden Roasts.
 */
export function cabinetRowModel(
  cabinet: ApiCabinet | undefined,
  sport: Sport,
  locale: Locale,
): CabinetRowModel | null {
  if (!cabinet || cabinet.hidden) {
    return null;
  }
  const m = messagesFor(locale);
  const view = cabinet.perSport[sport];
  const earned = view.kinds
    .filter((kind) => kind.count > 0)
    .sort(
      (left, right) =>
        Number(right.kind === "mvp") - Number(left.kind === "mvp") ||
        right.count - left.count,
    )
    .slice(0, TOP_COINS);
  const coins = earned.map((kind) => ({
    kind: kind.kind,
    name: markName(kind.kind, locale),
    count: m.marks.count(kind.count),
  }));
  const meta = cabinetReceivedCopy(view.total, locale);
  const empty = coins.length === 0 ? m.mobileMarks.cabinet.empty : null;
  return {
    title: m.marks.cabinet.title,
    meta,
    coins,
    empty,
    spoken: m.mobileMarks.cabinet.rowSpoken(
      meta,
      empty ??
        earned
          .map((kind) =>
            m.mobileMarks.cabinet.coinSpoken(
              markName(kind.kind, locale),
              kind.count,
            ),
          )
          .join(m.common.listSeparator),
    ),
  };
}

export type CabinetKindRow = {
  kind: CoinKind;
  name: string;
  sub: string;
  /** `×3`; null for "Not yet". */
  count: string | null;
  earned: boolean;
  spoken: string;
};

function kindSub(kind: CabinetKind, locale: Locale): string {
  const m = messagesFor(locale);
  const last = kind.count > 0 ? kind.lastFrom : null;
  const who = last ? (last.giverName ?? m.common.someone) : null;
  const sub =
    last && who
      ? kind.count === 1
        ? m.mobileMarks.cabinet.from(who, shortDay(last.playedAt, locale))
        : cabinetLastFromCopy(who, shortDay(last.playedAt, locale), locale)
      : m.marks.cabinet.notYet;
  return kind.hiddenFromOthers
    ? sentences([sub, m.marks.roast.hiddenFromOthers], locale)
    : sub;
}

function kindRow(kind: CabinetKind, locale: Locale): CabinetKindRow {
  const m = messagesFor(locale);
  const name = markName(kind.kind, locale);
  const sub = kindSub(kind, locale);
  const earned = kind.count > 0;
  return {
    kind: kind.kind,
    name,
    sub,
    count: earned ? m.marks.count(kind.count) : null,
    earned,
    spoken: sentences(
      [name, earned ? m.marks.cabinet.received(kind.count) : null, sub],
      locale,
    ),
  };
}

/** A group whose kinds differ by sport says which sport it counts. */
function groupVariesBySport(group: GiverGroup) {
  return MARK_KINDS.some(
    (kind) =>
      MARK_META[kind].group === group &&
      MARK_META[kind].sports.length < SPORTS.length,
  );
}

export type CabinetSectionModel = {
  group: GiverGroup;
  title: string;
  meta: string;
  rows: CabinetKindRow[];
};

export type CabinetMvpModel = {
  /** `×3`; null for "Not yet". */
  count: string | null;
  name: string;
  line: string;
  earned: boolean;
  spoken: string;
};

export type CabinetScreenModel = {
  tabs: { sport: Sport; label: string }[];
  mvp: CabinetMvpModel;
  summary: { received: string; notYet: string };
  sections: CabinetSectionModel[];
  /** The owner's "Hide roasts from my profile" toggle. */
  roasts: { title: string; help: string; hidden: boolean } | null;
};

function mvpModel(view: CabinetSport, locale: Locale): CabinetMvpModel {
  const m = messagesFor(locale);
  const c = m.mobileMarks.cabinet;
  const name = markName("mvp", locale);
  if (view.mvpCount === 0) {
    const line = m.marks.cabinet.notYet;
    return {
      count: null,
      name,
      line,
      earned: false,
      spoken: sentences([name, line], locale),
    };
  }
  const times = {
    vote: c.mvpTimes.vote,
    organizer: c.mvpTimes.organizer,
    tie_break: c.mvpTimes.tieBreak,
  };
  const ways = MVP_WAYS.filter((way) => view.mvpDecidedBy[way] > 0).map((way) =>
    times[way](view.mvpDecidedBy[way]),
  );
  const last = view.kinds.find((kind) => kind.kind === "mvp")?.lastFrom;
  const line = sentences(
    [
      ways.length > 0 ? c.mvpHow(ways) : null,
      last
        ? c.lastOne(
            weekdayDay(last.playedAt, locale),
            cabinetGameLabel(last.game, locale),
          )
        : null,
    ],
    locale,
  );
  return {
    count: m.marks.count(view.mvpCount),
    name,
    line,
    earned: true,
    spoken: sentences(
      [name, m.marks.cabinet.received(view.mvpCount), line],
      locale,
    ),
  };
}

/**
 * All marks on one sport's tab (3a): the MVP first, the totals, then each
 * Giver group's kinds with their count or "Not yet". `gamesPlayed` is the
 * sport's game count from the Player profile, when known.
 */
export function cabinetScreenModel(
  cabinet: ShownCabinet,
  sport: Sport,
  gamesPlayed: number | null,
  locale: Locale,
): CabinetScreenModel {
  const m = messagesFor(locale);
  const c = m.mobileMarks.cabinet;
  const view = cabinet.perSport[sport];
  const received = c.marksReceived(view.total);
  return {
    tabs: cabinet.sports.map((tab) => ({ sport: tab, label: m.common[tab] })),
    mvp: mvpModel(view, locale),
    summary: {
      received:
        gamesPlayed === null
          ? received
          : c.marksReceivedIn(received, gamesPlayed),
      notYet: cabinetKindsNotYetCopy(
        view.kindsNotYet,
        view.kinds.length,
        locale,
      ),
    },
    sections: GIVER_GROUPS.flatMap((group) => {
      const rows = view.kinds
        .filter((kind) => kind.group === group)
        .map((kind) => kindRow(kind, locale));
      if (rows.length === 0) {
        return [];
      }
      return [
        {
          group,
          title: c.sections[group],
          meta: groupVariesBySport(group)
            ? c.kindsIn(rows.length, sport)
            : c.kinds(rows.length),
          rows,
        },
      ];
    }),
    roasts:
      cabinet.isOwner && cabinet.hideRoasts !== null
        ? {
            title: m.marks.settings.hideRoasts,
            help: m.marks.settings.hideRoastsHelp,
            hidden: cabinet.hideRoasts,
          }
        : null,
  };
}

export type MarkDetailRow = {
  key: string;
  gameId: string;
  /** Who gave it; null for an MVP. */
  giver: { name: string; image: string | null } | null;
  title: string;
  relation: string | null;
  sub: string;
  score: string | null;
  date: string;
  canOpenGame: boolean;
  spoken: string;
};

export type MarkDetailModel = {
  kind: CoinKind;
  name: string;
  count: string;
  description: string;
  caption: string | null;
  rows: MarkDetailRow[];
  empty: string | null;
  footer: string | null;
};

function decidedByCopy(decidedBy: MvpDecidedBy | null, locale: Locale) {
  const m = messagesFor(locale);
  switch (decidedBy) {
    case "vote":
      return m.mobileMarks.detail.byVote;
    case "organizer":
      return m.marks.mvp.organizerPick;
    case "tie_break":
      return m.marks.mvp.tieBreak;
    case null:
      return m.common.someone;
  }
}

/** `6–4 6–3` on padel, `3–1` on football, from the owner's side. */
export function detailScore(score: KindDetailRow["score"]): string | null {
  return score && score.length > 0
    ? score.map((set) => `${set.us}–${set.them}`).join(" ")
    : null;
}

function detailRow(
  row: KindDetailRow,
  index: number,
  locale: Locale,
): MarkDetailRow {
  const m = messagesFor(locale);
  const title = row.giver
    ? row.giver.name
    : decidedByCopy(row.decidedBy, locale);
  const relation = row.relation ? markRelationCopy(row.relation, locale) : null;
  const sub = [cabinetGameLabel(row.game, locale), row.game.venueName].join(
    m.common.listSeparator,
  );
  const score = detailScore(row.score);
  const date = weekdayDay(row.playedAt, locale);
  return {
    key: `${row.gameId}-${index}`,
    gameId: row.gameId,
    giver: row.giver ? { name: row.giver.name, image: row.giver.image } : null,
    title,
    relation,
    sub,
    score,
    date,
    canOpenGame: row.canOpenGame,
    spoken: sentences(
      [
        title,
        relation,
        sub,
        score,
        date,
        row.canOpenGame ? m.profile.matchSheet.openGame : null,
      ],
      locale,
    ),
  };
}

/**
 * One kind's Games (3b), newest first: who gave it and from which side, or
 * how an MVP was decided. The footer names the first one and, when the
 * owner has another tab with this kind, says where those sit.
 */
export function markDetailModel(
  detail: KindDetail,
  tabs: readonly Sport[],
  locale: Locale,
): MarkDetailModel {
  const m = messagesFor(locale);
  const d = m.mobileMarks.detail;
  const kind = detail.kind;
  const description =
    kind === "mvp"
      ? markDescription(kind, locale)
      : d.about(
          markDescription(kind, locale),
          d.givenBy[MARK_META[kind].group],
        );
  const rows = detail.rows.map((row, index) => detailRow(row, index, locale));
  const first = detail.rows[detail.rows.length - 1];
  const otherTab = tabs.find(
    (tab) => tab !== detail.sport && cabinetKinds(tab).includes(kind),
  );
  const note = otherTab
    ? kind === "mvp"
      ? d.otherTabMvp(otherTab)
      : d.otherTab(otherTab)
    : null;
  return {
    kind,
    name: markName(kind, locale),
    count: m.marks.count(rows.length),
    description,
    caption: detail.hiddenFromOthers ? m.marks.roast.hiddenFromOthers : null,
    rows,
    empty: rows.length === 0 ? m.marks.cabinet.notYet : null,
    footer: first
      ? sentences(
          [d.firstOne(weekdayDay(first.playedAt, locale)), note],
          locale,
        )
      : null,
  };
}
