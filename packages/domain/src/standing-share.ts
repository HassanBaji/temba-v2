/**
 * Share and export for the Standing tab (design "Group standings" 2a–2e).
 * One sheet shares whatever lens and view is on screen, as a story image, a
 * square image, a one-page PDF, a CSV or a link. Everything a format shows is
 * worked out here, so the web and mobile Apps draw the same thing.
 */

import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatDayMonth } from "./format-game-start";
import type { GroupStandingRowData } from "./group-data";
import {
  SEASON_POINTS,
  formatSeasonRange,
  seasonDayNumber,
  seasonDisplayName,
  seasonLengthDays,
  type GroupSeasonData,
  type GroupSeasonStatus,
} from "./group-season";
import {
  standingDiffUnit,
  standingRecordLabel,
  standingRulesLine,
  standingShowsDraws,
  unrankedNote,
} from "./season-standing";
import {
  mostImprovedColumns,
  mostImprovedNoGainNote,
  mostImprovedTable,
  standingByLevel,
  standingLevelLabel,
  type MostImprovedRow,
  type StandingLadder,
  type StandingLevelsData,
  type StandingView,
} from "./standing-views";

export type StandingShareFormat = "story" | "square" | "pdf" | "csv" | "link";

export const STANDING_SHARE_FORMATS: readonly StandingShareFormat[] = [
  "story",
  "square",
  "pdf",
  "csv",
  "link",
];

/** Export sizes in pixels. The PDF page is A4 at 150 dpi. */
export const STANDING_SQUARE_SIZE = 1080;
export const STANDING_PDF_PAGE = { width: 1240, height: 1754 } as const;

const STORY_ROWS = 8;
const SQUARE_ROWS = 5;
/** Most improved leads with the top gainer, then five more. */
const STORY_GAINERS = 6;

export type StandingShareRowData = Pick<
  GroupStandingRowData,
  | "userId"
  | "name"
  | "nickname"
  | "position"
  | "ranked"
  | "played"
  | "wins"
  | "draws"
  | "losses"
  | "points"
  | "isViewer"
> & { diff?: number };

export type StandingShareSeason = GroupSeasonData & {
  status: GroupSeasonStatus;
};

export type StandingShareInput = {
  view: StandingView;
  rows: readonly StandingShareRowData[];
  /** `groups.standingLevels` for the lens; needed by By level and Most improved. */
  levels: StandingLevelsData | null;
  /** `null` on All-time. */
  season: StandingShareSeason | null;
  groupName: string;
  sport: string | null;
  /** When the Group was created: All-time reads "Since 1 May". */
  since?: Date | string | null;
  /** Marks the viewer's row, and adds it below the top rows when it is not in them. */
  highlight: boolean;
  now: Date;
};

function viewName(view: StandingView, locale: Locale) {
  const m = messagesFor(locale).group.standing.share.viewNames;
  return view === "by-level"
    ? m.byLevel
    : view === "most-improved"
      ? m.mostImproved
      : m.overall;
}

function viewTitle(view: StandingView, locale: Locale) {
  const m = messagesFor(locale).group.standing.views;
  return view === "by-level"
    ? m.byLevel
    : view === "most-improved"
      ? m.mostImproved
      : m.overall;
}

function lensName(season: StandingShareSeason | null, locale: Locale) {
  return season
    ? seasonDisplayName(season.name, locale)
    : messagesFor(locale).group.standing.share.card.allTime;
}

/** `"Season 3, overall"`: the sheet's "What's on screen" line. */
export function standingShareWhat(
  season: StandingShareSeason | null,
  view: StandingView,
  locale: Locale,
) {
  return messagesFor(locale).group.standing.share.what(
    lensName(season, locale),
    viewName(view, locale),
  );
}

export type StandingShareFormatOption = {
  format: StandingShareFormat;
  title: string;
  description: string;
};

export function standingShareFormatOptions(
  locale: Locale,
): StandingShareFormatOption[] {
  const m = messagesFor(locale).group.standing.share.formats;
  return STANDING_SHARE_FORMATS.map((format) => ({
    format,
    title: m[format].title,
    description: m[format].description,
  }));
}

export type StandingShareAction =
  | "share-image"
  | "save-image"
  | "share-file"
  | "save-file"
  | "copy-link";

export type StandingSharePreview = {
  title: string;
  description: string;
  primary: { action: StandingShareAction; label: string };
  secondary: { action: StandingShareAction; label: string } | null;
  /** Whether Highlight me changes this format. */
  highlights: boolean;
};

/** The sheet's preview card and buttons for the picked format. */
export function standingSharePreview(
  format: StandingShareFormat,
  highlight: boolean,
  locale: Locale,
): StandingSharePreview {
  const m = messagesFor(locale).group.standing.share;
  const highlights =
    format === "story" || format === "square" || format === "pdf";
  const description =
    highlights && highlight
      ? `${m.formats[format].preview} ${m.highlighted}`
      : m.formats[format].preview;
  const base = { title: m.formats[format].title, description, highlights };
  switch (format) {
    case "story":
    case "square":
      return {
        ...base,
        primary: { action: "share-image", label: m.actions.shareImage },
        secondary: { action: "save-image", label: m.actions.saveToPhotos },
      };
    case "pdf":
      return {
        ...base,
        primary: { action: "share-file", label: m.actions.sharePdf },
        secondary: { action: "save-file", label: m.actions.saveToFiles },
      };
    case "csv":
      return {
        ...base,
        primary: { action: "share-file", label: m.actions.exportCsv },
        secondary: { action: "save-file", label: m.actions.saveToFiles },
      };
    case "link":
      return {
        ...base,
        primary: { action: "copy-link", label: m.actions.copyLink },
        secondary: null,
      };
  }
}

function shownName(row: StandingShareRowData, locale: Locale) {
  const fallback = messagesFor(locale).group.standing.share.card.member;
  if (row.isViewer) {
    return row.name ?? fallback;
  }
  return row.nickname?.name ?? row.name ?? fallback;
}

function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/** `"after 35 days"`, `"final"`, `"every game"` or `"not started"`. */
function progress(input: StandingShareInput, locale: Locale) {
  const m = messagesFor(locale).group.standing.share.card;
  const { season } = input;
  if (!season) {
    return m.everyGame;
  }
  if (season.status === "closed") {
    return m.final;
  }
  if (season.status === "upcoming") {
    return m.notStarted;
  }
  return m.afterDays(seasonDayNumber(season, input.now));
}

/** `"1 NOV – 31 JAN"`, or `"SINCE 1 MAY"` on All-time. */
function rangeLabel(input: StandingShareInput, locale: Locale) {
  const m = messagesFor(locale).group.standing.share.card;
  if (input.season) {
    return formatSeasonRange(input.season, locale).toLocaleUpperCase();
  }
  return input.since
    ? m.since(formatDayMonth(input.since, locale)).toLocaleUpperCase()
    : null;
}

function kicker(input: StandingShareInput, locale: Locale) {
  return lensName(input.season, locale).toLocaleUpperCase();
}

function pointsRule(locale: Locale) {
  return messagesFor(locale).group.standing.share.card.pointsRule(
    SEASON_POINTS.win,
    SEASON_POINTS.draw,
  );
}

export type StandingShareCardRow = {
  key: string;
  position: string;
  name: string;
  /** W–D–L, a band, or a change line. */
  middle: string | null;
  value: string;
  highlighted: boolean;
};

export type StandingShareCard = {
  range: string | null;
  kicker: string;
  title: string;
  subtitle: string;
  caption: string | null;
  /** Column heads over the rows; only the Overall story has them. */
  columns: { middle: string; value: string } | null;
  /** Most improved story: the top gainer, large. */
  lead: {
    position: string;
    name: string;
    value: string;
    line: string | null;
    highlighted: boolean;
  } | null;
  rows: StandingShareCardRow[];
  /** Shown in place of rows when the view has nobody ranked. */
  empty: string | null;
  footStart: string | null;
  footEnd: string | null;
};

/**
 * The top rows, with the viewer's row added at the bottom when Highlight me
 * is on and they rank below the cut.
 */
function topRows<T extends { userId: string; isViewer: boolean }>(
  ranked: readonly T[],
  limit: number,
  highlight: boolean,
): { shown: T[] } {
  const shown = ranked.slice(0, limit);
  if (!highlight || shown.some((row) => row.isViewer)) {
    return { shown };
  }
  const viewer = ranked.find((row) => row.isViewer);
  return { shown: viewer ? [...shown, viewer] : shown };
}

function cardRow(
  row: StandingShareRowData,
  middle: string | null,
  value: string,
  highlight: boolean,
  locale: Locale,
): StandingShareCardRow {
  return {
    key: row.userId,
    position: String(row.position ?? ""),
    name: shownName(row, locale),
    middle,
    value,
    highlighted: highlight && row.isViewer,
  };
}

function overallCard(
  input: StandingShareInput,
  format: "story" | "square",
  locale: Locale,
): StandingShareCard {
  const m = messagesFor(locale).group.standing.share.card;
  const ranked = input.rows.filter((row) => row.ranked);
  const unranked = input.rows.length - ranked.length;
  const limit = format === "story" ? STORY_ROWS : SQUARE_ROWS;
  const { shown } = topRows(ranked, limit, input.highlight);
  const rest = ranked.length - shown.length;
  const restLine = [
    rest > 0 ? m.moreRanked(rest) : null,
    unranked > 0 ? m.unranked(unranked) : null,
  ]
    .filter((part): part is string => part != null)
    .join(", ");
  const caption = m.caption(
    viewTitle("overall", locale),
    progress(input, locale),
  );
  return {
    range: rangeLabel(input, locale),
    kicker: kicker(input, locale),
    title: m.standing,
    subtitle: input.groupName,
    caption,
    columns:
      format === "story"
        ? { middle: m.recordColumn, value: m.pointsColumn }
        : null,
    lead: null,
    rows: shown.map((row) =>
      cardRow(
        row,
        standingRecordLabel(row),
        String(row.points),
        input.highlight,
        locale,
      ),
    ),
    empty: ranked.length === 0 ? m.noResults : null,
    footStart:
      format === "story"
        ? restLine || null
        : m.sentence(capitalize(progress(input, locale)), pointsRule(locale)),
    footEnd: format === "story" ? pointsRule(locale) : null,
  };
}

function byLevelCard(
  input: StandingShareInput,
  levels: StandingLevelsData,
  format: "story" | "square",
  locale: Locale,
): StandingShareCard {
  const m = messagesFor(locale).group.standing.share.card;
  const { sections } = standingByLevel(
    input.rows,
    levels.members,
    levels.sport,
    locale,
  );
  // One category per image: the viewer's, else the top one.
  const section =
    sections.find((entry) => entry.rows.some((row) => row.isViewer)) ??
    sections[0];
  const limit = format === "story" ? STORY_ROWS : SQUARE_ROWS;
  const { shown } = topRows(section?.rows ?? [], limit, input.highlight);
  return {
    range: rangeLabel(input, locale),
    kicker: kicker(input, locale),
    title: section?.title ?? m.standing,
    subtitle: m.byLevel(input.groupName),
    caption: null,
    columns: null,
    lead: null,
    rows: shown.map((row) =>
      cardRow(row, row.levelLabel, String(row.points), input.highlight, locale),
    ),
    empty: section ? null : m.noResults,
    footStart: m.sentence(
      capitalize(progress(input, locale)),
      pointsRule(locale),
    ),
    footEnd: null,
  };
}

function improvementLine(
  row: MostImprovedRow<StandingShareRowData>,
  ladder: StandingLadder,
  sport: string | null,
  locale: Locale,
) {
  if (row.changeLine) {
    return row.changeLine;
  }
  return row.start != null &&
    row.end != null &&
    (ladder === "tier" || sport === "football")
    ? messagesFor(locale).group.standing.share.card.valueChange(
        row.start,
        row.end,
      )
    : null;
}

function mostImprovedCard(
  input: StandingShareInput,
  levels: StandingLevelsData & { ladder: StandingLadder },
  format: "story" | "square",
  locale: Locale,
): StandingShareCard {
  const m = messagesFor(locale).group.standing.share.card;
  const { ranked } = mostImprovedTable(
    input.rows,
    levels.members,
    levels.ladder,
    levels.sport,
    locale,
  );
  const gained =
    levels.ladder === "tier"
      ? m.pointsGained(input.groupName, progress(input, locale))
      : m.levelGained(input.groupName, progress(input, locale));
  const toRow = (row: MostImprovedRow<StandingShareRowData>) =>
    cardRow(
      row,
      improvementLine(row, levels.ladder, levels.sport, locale),
      row.gain ?? "",
      input.highlight,
      locale,
    );
  const first = ranked[0];
  const story = format === "story";
  const lead =
    story && first
      ? {
          position: String(first.position ?? ""),
          name: shownName(first, locale),
          value: first.gain ?? "",
          line:
            first.start != null && first.end != null
              ? [m.valueChange(first.start, first.end), first.changeLine]
                  .filter((part): part is string => part != null)
                  .join(", ")
              : null,
          highlighted: input.highlight && first.isViewer,
        }
      : null;
  const { shown } = story
    ? topRows(ranked.slice(1), STORY_GAINERS - 1, input.highlight)
    : topRows(ranked, SQUARE_ROWS, input.highlight);
  return {
    range: rangeLabel(input, locale),
    kicker: kicker(input, locale),
    title: m.mostImproved,
    subtitle: gained,
    caption: null,
    columns: null,
    lead,
    rows: shown.map(toRow),
    empty: ranked.length === 0 ? m.noGains : null,
    footStart: m.rankedOnly,
    footEnd: null,
  };
}

/** What a story or square image shows for the lens and view on screen. */
export function standingShareCard(
  input: StandingShareInput,
  format: "story" | "square",
  locale: Locale,
): StandingShareCard {
  const levels = input.levels;
  if (input.view === "by-level" && levels) {
    return byLevelCard(input, levels, format, locale);
  }
  if (input.view === "most-improved" && levels?.ladder) {
    return mostImprovedCard(
      input,
      { ...levels, ladder: levels.ladder },
      format,
      locale,
    );
  }
  return overallCard(input, format, locale);
}

export type StandingShareColumn = {
  key: string;
  label: string;
  /** The CSV header, in full words. */
  csvLabel: string;
  align: "start" | "center" | "end";
  /** The bold, last column. */
  strong?: boolean;
  /** The flexible name column. */
  grow?: boolean;
};

export type StandingShareTableRow = {
  key: string;
  cells: string[];
  /** The same row for a spreadsheet: plain numbers, no dash for a missing place. */
  csv: string[];
  muted: boolean;
  highlighted: boolean;
};

export type StandingShareTableSection = {
  label: string | null;
  note: string | null;
  rows: StandingShareTableRow[];
};

export type StandingShareTable = {
  range: string | null;
  title: string;
  subtitle: string;
  columns: StandingShareColumn[];
  sections: StandingShareTableSection[];
  footer: string;
};

const MINUS = "−";
const DASH = "–";

function signedCount(value: number) {
  if (value > 0) {
    return `+${value}`;
  }
  return value < 0 ? `${MINUS}${-value}` : "0";
}

/** A display figure as a spreadsheet reads it: ASCII minus, no plus, no grouping. */
function csvNumber(text: string | null) {
  if (text == null) {
    return "";
  }
  return text.replace(MINUS, "-").replace(/^\+/, "").replace(/,/g, "");
}

function recordTable(
  input: StandingShareInput,
  locale: Locale,
): StandingShareTable {
  const g = messagesFor(locale).group;
  const t = g.standing.share.table;
  const columnsCopy = {
    player: t.player,
    played: t.played,
    wins: t.won,
    draws: t.drawn,
    losses: t.lost,
    points: t.points,
  };
  const unit = standingDiffUnit(input.sport);
  const showDraws = standingShowsDraws(input.sport, input.rows);
  const levels = input.levels?.ladder === "level" ? input.levels : null;
  const levelByUser = new Map(
    (levels?.members ?? []).map((level) => [level.userId, level]),
  );
  const diffLabel = unit === "sets" ? t.sets : t.difference;
  const columns: StandingShareColumn[] = [
    { key: "position", label: "", csvLabel: t.csv.position, align: "start" },
    {
      key: "player",
      label: columnsCopy.player,
      csvLabel: t.csv.player,
      align: "start",
      grow: true,
    },
    ...(levels
      ? [
          {
            key: "level",
            label: t.level,
            csvLabel: t.csv.level,
            align: "center" as const,
          },
        ]
      : []),
    {
      key: "played",
      label: columnsCopy.played,
      csvLabel: t.csv.played,
      align: "center",
    },
    {
      key: "won",
      label: columnsCopy.wins,
      csvLabel: t.csv.won,
      align: "center",
    },
    ...(showDraws
      ? [
          {
            key: "drawn",
            label: columnsCopy.draws,
            csvLabel: t.csv.drawn,
            align: "center" as const,
          },
        ]
      : []),
    {
      key: "lost",
      label: columnsCopy.losses,
      csvLabel: t.csv.lost,
      align: "center",
    },
    {
      key: "diff",
      label: diffLabel,
      csvLabel: unit === "sets" ? t.csv.setDifference : t.csv.scoreDifference,
      align: "center",
    },
    {
      key: "points",
      label: columnsCopy.points,
      csvLabel: t.csv.points,
      align: "end",
      strong: true,
    },
  ];

  const toRow = (
    row: StandingShareRowData,
    position: number | null,
    levelLabel: string | null,
  ): StandingShareTableRow => {
    const diff = row.diff ?? 0;
    const counts = [
      String(row.played),
      String(row.wins),
      ...(showDraws ? [String(row.draws)] : []),
      String(row.losses),
    ];
    const name = shownName(row, locale);
    return {
      key: row.userId,
      cells: [
        position == null ? DASH : String(position),
        name,
        ...(levels ? [levelLabel ?? DASH] : []),
        ...counts,
        signedCount(diff),
        String(row.points),
      ],
      csv: [
        position == null ? "" : String(position),
        name,
        ...(levels ? [levelLabel ?? ""] : []),
        ...counts,
        String(diff),
        String(row.points),
      ],
      muted: position == null,
      highlighted: input.highlight && row.isViewer,
    };
  };

  const unrankedSection = (
    rows: readonly StandingShareRowData[],
  ): StandingShareTableSection[] =>
    rows.length > 0
      ? [
          {
            label: messagesFor(locale).group.standing.share.table.unranked,
            note: unrankedNote(locale),
            rows: rows.map((row) =>
              toRow(
                row,
                null,
                standingLevelLabel(levelByUser.get(row.userId), input.sport),
              ),
            ),
          },
        ]
      : [];

  let sections: StandingShareTableSection[];
  if (input.view === "by-level" && levels) {
    const split = standingByLevel(
      input.rows,
      levels.members,
      levels.sport,
      locale,
    );
    sections = [
      ...split.sections.map((section) => ({
        label: section.title,
        note: section.countLabel,
        rows: section.rows.map((row) =>
          toRow(row, row.position, row.levelLabel),
        ),
      })),
      ...unrankedSection(split.unranked),
    ];
  } else {
    sections = [
      {
        label: null,
        note: null,
        rows: input.rows
          .filter((row) => row.ranked)
          .map((row) =>
            toRow(
              row,
              row.position,
              standingLevelLabel(levelByUser.get(row.userId), input.sport),
            ),
          ),
      },
      ...unrankedSection(input.rows.filter((row) => !row.ranked)),
    ];
  }

  const meaning =
    unit === "sets" ? g.standing.setDifference : g.standing.scoreDifference;
  return {
    range: rangeLabel(input, locale),
    title: input.groupName,
    subtitle: tableSubtitle(input, locale),
    columns,
    sections,
    footer: `${standingRulesLine(unit, locale)} ${t.diffNote(diffLabel, meaning)}`,
  };
}

function tableSubtitle(input: StandingShareInput, locale: Locale) {
  const t = messagesFor(locale).group.standing.share.table;
  const title = t.standingTitle(
    lensName(input.season, locale),
    viewName(input.view, locale),
  );
  const { season } = input;
  const when = !season
    ? t.everyGame
    : season.status === "active"
      ? t.afterDaysOf(
          seasonDayNumber(season, input.now),
          seasonLengthDays(season),
        )
      : season.status === "closed"
        ? t.final
        : null;
  return when
    ? messagesFor(locale).group.standing.share.card.sentence(title, when)
    : title;
}

function mostImprovedShareTable(
  input: StandingShareInput,
  levels: StandingLevelsData & { ladder: StandingLadder },
  locale: Locale,
): StandingShareTable {
  const g = messagesFor(locale).group;
  const t = g.standing.share.table;
  const heads = mostImprovedColumns(input.season?.status ?? null, locale);
  const showChange = levels.ladder === "level" && levels.sport !== "football";
  const columns: StandingShareColumn[] = [
    { key: "position", label: "", csvLabel: t.csv.position, align: "start" },
    {
      key: "player",
      label: t.player,
      csvLabel: t.csv.player,
      align: "start",
      grow: true,
    },
    ...(showChange
      ? [
          {
            key: "change",
            label: t.change,
            csvLabel: t.csv.change,
            align: "center" as const,
          },
        ]
      : []),
    { key: "start", label: heads.start, csvLabel: t.csv.start, align: "end" },
    { key: "end", label: heads.end, csvLabel: t.csv.end, align: "end" },
    {
      key: "gain",
      label: heads.gain,
      csvLabel: t.csv.gain,
      align: "end",
      strong: true,
    },
  ];
  const { ranked, noGain, unranked } = mostImprovedTable(
    input.rows,
    levels.members,
    levels.ladder,
    levels.sport,
    locale,
  );
  const toRow = (
    row: MostImprovedRow<StandingShareRowData>,
  ): StandingShareTableRow => {
    const name = shownName(row, locale);
    return {
      key: row.userId,
      cells: [
        row.position == null ? DASH : String(row.position),
        name,
        ...(showChange ? [row.changeLine ?? DASH] : []),
        row.start ?? DASH,
        row.end ?? DASH,
        row.gain ?? DASH,
      ],
      csv: [
        row.position == null ? "" : String(row.position),
        name,
        ...(showChange ? [row.changeLine ?? ""] : []),
        csvNumber(row.start),
        csvNumber(row.end),
        csvNumber(row.gain),
      ],
      muted: row.position == null,
      highlighted: input.highlight && row.isViewer,
    };
  };
  const sections: StandingShareTableSection[] = [
    { label: null, note: null, rows: ranked.map(toRow) },
  ];
  if (noGain.length > 0) {
    sections.push({
      label: g.standing.views.noGain,
      note: mostImprovedNoGainNote(levels.ladder, locale),
      rows: noGain.map(toRow),
    });
  }
  if (unranked.length > 0) {
    sections.push({
      label: messagesFor(locale).group.standing.share.table.unranked,
      note: unrankedNote(locale),
      rows: unranked.map(toRow),
    });
  }
  return {
    range: rangeLabel(input, locale),
    title: input.groupName,
    subtitle: tableSubtitle(input, locale),
    columns,
    sections,
    footer:
      g.standing.views.footer[
        levels.ladder === "tier" ? "gainTier" : "gainLevel"
      ],
  };
}

/** Every player and every column of the view on screen: the PDF page and the CSV. */
export function standingShareTable(
  input: StandingShareInput,
  locale: Locale,
): StandingShareTable {
  const levels = input.levels;
  if (input.view === "most-improved" && levels?.ladder && input.season) {
    return mostImprovedShareTable(
      input,
      { ...levels, ladder: levels.ladder },
      locale,
    );
  }
  return recordTable(input, locale);
}

/**
 * A cell a spreadsheet would read as a formula (`=`, `+`, `-`, `@`, or a
 * tab or return first) is opened with an apostrophe, so a player's name can
 * never run as one.
 */
function csvCell(value: string, text: boolean) {
  const safe = text && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * The table as CSV, with a byte order mark so Excel opens Arabic names as
 * UTF-8. A table with headed sections gains a first Section column.
 */
export function standingShareCsv(table: StandingShareTable, locale: Locale) {
  const sectioned = table.sections.some((section) => section.label != null);
  const textColumns = new Set(["player", "level", "change"]);
  const header = [
    ...(sectioned
      ? [messagesFor(locale).group.standing.share.table.csv.section]
      : []),
    ...table.columns.map((column) => column.csvLabel),
  ];
  const lines = [header.map((cell) => csvCell(cell, true)).join(",")];
  for (const section of table.sections) {
    for (const row of section.rows) {
      const cells = row.csv.map((cell, index) =>
        csvCell(cell, textColumns.has(table.columns[index]?.key ?? "")),
      );
      lines.push(
        [
          ...(sectioned ? [csvCell(section.label ?? "", true)] : []),
          ...cells,
        ].join(","),
      );
    }
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** `temba-standing-season-3-by-level.png`: ASCII, whatever the lens is called. */
export function standingShareFileName(
  input: Pick<StandingShareInput, "season" | "view">,
  extension: "png" | "pdf" | "csv",
) {
  const lens = input.season
    ? input.season.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "season"
    : "all-time";
  return `temba-standing-${lens}-${input.view}.${extension}`;
}

/** The query values a shared link carries; the path is each App's. */
export function standingShareQuery(
  seasonId: string | null,
  view: StandingView,
): { season: string; view: StandingView } {
  return { season: seasonId ?? "all-time", view };
}

/** The lens and view a shared link opens, read back from its query. */
export function standingViewFromQuery(
  query: { season?: string | null; view?: string | null },
  seasonIds: readonly string[],
): { seasonId: string | null | undefined; view: StandingView | undefined } {
  const view =
    query.view === "overall" ||
    query.view === "by-level" ||
    query.view === "most-improved"
      ? query.view
      : undefined;
  const seasonId =
    query.season === "all-time"
      ? null
      : query.season && seasonIds.includes(query.season)
        ? query.season
        : undefined;
  return { seasonId, view };
}
