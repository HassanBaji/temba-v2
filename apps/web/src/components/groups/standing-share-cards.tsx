"use client";

import { colors } from "@repo/design-tokens";
import {
  STANDING_PDF_PAGE,
  STANDING_SQUARE_SIZE,
  type StandingShareCard,
  type StandingShareCardRow,
  type StandingShareTable,
} from "@repo/domain/standing-share";

import {
  STORY_HEIGHT,
  STORY_WIDTH,
} from "~/components/share-result/scaled-canvas";
import { Big, Label, Wordmark } from "~/components/share-result/story-parts";
import { useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

/*
 * Design "Group standings" 2b–2e, drawn at export size: the cards are three
 * times the design's 360px frames, the page is A4 at 150 dpi.
 */

const PAD_X = 84;
const PAD_Y = 78;
const ROW_HEIGHT = 114;

function CardHead({ range }: { range: string | null }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <Wordmark mark={48} px={36} />
      {range ? (
        <Label px={30} tracking={0} className="text-on-control-muted">
          {range}
        </Label>
      ) : null}
    </div>
  );
}

function CardRows({ rows }: { rows: StandingShareCardRow[] }) {
  return (
    <div className="flex flex-col">
      {rows.map((row, index) => {
        const ruled =
          index > 0 && !row.highlighted && !rows[index - 1]?.highlighted;
        return (
          <div
            key={row.key}
            className={cn(
              "flex items-center gap-[30px] px-[30px]",
              row.highlighted && "bg-paper text-ink rounded-[24px]",
              ruled && "border-control-rule border-t-[3px]",
            )}
            style={{ height: ROW_HEIGHT }}
          >
            <Big px={45} expanded className="w-[54px] shrink-0 font-bold">
              {row.position}
            </Big>
            <Big px={42} className="min-w-0 flex-1 truncate font-semibold">
              {row.name}
            </Big>
            {row.middle ? (
              <Big
                px={36}
                className={cn(
                  "shrink-0",
                  row.highlighted
                    ? "text-muted-foreground"
                    : "text-on-control-muted",
                )}
              >
                {row.middle}
              </Big>
            ) : null}
            <Big
              px={48}
              expanded
              className="w-[150px] shrink-0 text-end font-bold"
            >
              {row.value}
            </Big>
          </div>
        );
      })}
    </div>
  );
}

function Empty({ text }: { text: string | null }) {
  return text ? (
    <Big px={42} className="text-on-control-muted mt-[60px]">
      {text}
    </Big>
  ) : null;
}

/** Design 2b and 2d: 1080 × 1920. */
export function StandingStoryCard({ card }: { card: StandingShareCard }) {
  return (
    <div
      className="light bg-ink text-paper flex flex-col"
      style={{
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        padding: `${PAD_Y}px ${PAD_X}px`,
      }}
    >
      <CardHead range={card.range} />
      <Big
        px={66}
        ratio={1}
        expanded
        tracking={-0.02}
        className="text-on-control-muted mt-[78px] font-bold"
      >
        {card.kicker}
      </Big>
      <Big
        px={card.lead ? 150 : 174}
        ratio={0.94}
        expanded
        tracking={-0.04}
        className="mt-[18px] font-bold"
      >
        {card.title}
      </Big>
      {card.lead ? (
        <Big px={39} className="text-on-control-muted mt-[36px]">
          {card.subtitle}
        </Big>
      ) : (
        <>
          <Big px={45} className="mt-[42px] font-semibold">
            {card.subtitle}
          </Big>
          {card.caption ? (
            <Big px={39} className="text-on-control-muted">
              {card.caption}
            </Big>
          ) : null}
        </>
      )}
      {card.lead ? (
        <div className="border-control-rule mt-[78px] border-t-[3px] pt-[54px]">
          <div className="flex items-baseline gap-[30px]">
            <Big px={45} expanded className="text-on-control-muted font-bold">
              {card.lead.position}
            </Big>
            <Big
              px={60}
              className={cn(
                "font-semibold",
                card.lead.highlighted && "underline underline-offset-[12px]",
              )}
            >
              {card.lead.name}
            </Big>
          </div>
          <Big
            px={288}
            ratio={0.9}
            expanded
            tracking={-0.04}
            className="mt-[24px] font-bold"
          >
            {card.lead.value}
          </Big>
          {card.lead.line ? (
            <Big px={39} className="text-on-control-muted mt-[24px]">
              {card.lead.line}
            </Big>
          ) : null}
        </div>
      ) : null}
      {card.columns ? (
        <div className="text-on-control-muted mt-[66px] flex justify-end gap-[30px] px-[30px] pb-[18px]">
          <Label px={27} tracking={0}>
            {card.columns.middle}
          </Label>
          <Label px={27} tracking={0} className="w-[150px] text-end">
            {card.columns.value}
          </Label>
        </div>
      ) : null}
      <div className={card.columns ? undefined : "mt-[66px]"}>
        <CardRows rows={card.rows} />
        {card.lead ? null : <Empty text={card.empty} />}
      </div>
      <div className="text-on-control-muted mt-auto flex justify-between gap-6">
        <Big px={33}>{card.footStart}</Big>
        {card.footEnd ? <Big px={33}>{card.footEnd}</Big> : null}
      </div>
    </div>
  );
}

/** Design 2c: 1080 × 1080. */
export function StandingSquareCard({ card }: { card: StandingShareCard }) {
  return (
    <div
      className="light bg-ink text-paper flex flex-col"
      style={{
        width: STANDING_SQUARE_SIZE,
        height: STANDING_SQUARE_SIZE,
        padding: `${PAD_Y}px ${PAD_X}px`,
      }}
    >
      <CardHead range={card.range} />
      <div className="mt-[48px] flex items-baseline justify-between gap-6">
        <Big
          px={102}
          ratio={1}
          expanded
          tracking={-0.04}
          className="min-w-0 truncate font-bold"
        >
          {card.title}
        </Big>
        <Big
          px={39}
          expanded
          className="text-on-control-muted shrink-0 font-bold"
        >
          {card.kicker}
        </Big>
      </div>
      <Big px={36} className="text-on-control-muted mt-[12px]">
        {card.subtitle}
      </Big>
      <div className="mt-[36px]">
        <CardRows rows={card.rows} />
        <Empty text={card.empty} />
      </div>
      <Big px={33} className="text-on-control-muted mt-auto">
        {card.footStart}
      </Big>
    </div>
  );
}

const PAGE_PAD = 90;
/** Row height at full size; a long table shrinks to stay on one page. */
const PAGE_ROW = 72;
const PAGE_ROOM = 1220;

function cellWidth(key: string) {
  switch (key) {
    case "position":
      return 56;
    case "level":
    case "change":
      return key === "change" ? 170 : 92;
    case "diff":
      return 84;
    case "start":
    case "end":
    case "gain":
    case "points":
      return 100;
    default:
      return 64;
  }
}

/** Design 2e: one A4 page with every player and every column. */
export function StandingPdfPage({ table }: { table: StandingShareTable }) {
  const appName = useMessages().common.appName.toUpperCase();
  const rowCount = table.sections.reduce(
    (total, section) =>
      total + section.rows.length + (section.label != null ? 1 : 0),
    1,
  );
  const scale = Math.max(0.45, Math.min(1, PAGE_ROOM / (rowCount * PAGE_ROW)));
  const row = Math.round(PAGE_ROW * scale);
  const text = Math.round(29 * Math.max(scale, 0.7));
  const align = (value: "start" | "center" | "end") =>
    value === "start"
      ? "text-start"
      : value === "center"
        ? "text-center"
        : "text-end";
  return (
    <div
      className="light bg-paper text-ink flex flex-col"
      style={{
        width: STANDING_PDF_PAGE.width,
        height: STANDING_PDF_PAGE.height,
        padding: `${PAGE_PAD}px ${PAGE_PAD}px 68px`,
      }}
    >
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <svg
            viewBox="0 0 100 100"
            aria-hidden="true"
            width={36}
            height={36}
            className="block shrink-0"
          >
            <circle cx="50" cy="50" r="44" fill={colors.ink} />
            <path
              d="M6,50 C18,16 82,16 94,50"
              fill="none"
              stroke={colors.paper}
              strokeWidth="6"
            />
          </svg>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 300,
              fontSize: 30,
              letterSpacing: "0.18em",
            }}
          >
            {appName}
          </span>
        </div>
        {table.range ? (
          <Label px={22} tracking={0} className="text-muted-foreground">
            {table.range}
          </Label>
        ) : null}
      </div>
      <Big
        px={68}
        ratio={1}
        expanded
        tracking={-0.02}
        className="mt-[54px] font-bold"
      >
        {table.title}
      </Big>
      <Big px={29} className="text-muted-foreground mt-[16px]">
        {table.subtitle}
      </Big>
      <div className="mt-[48px] flex flex-col">
        <div
          className="text-muted-foreground flex items-center font-mono uppercase"
          style={{
            height: Math.round(60 * Math.max(scale, 0.7)),
            fontSize: 22,
          }}
        >
          {table.columns.map((column) => (
            <span
              key={column.key}
              className={cn(
                align(column.align),
                column.grow ? "min-w-0 flex-1" : "shrink-0",
                column.strong && "text-ink pe-[10px]",
              )}
              style={column.grow ? undefined : { width: cellWidth(column.key) }}
            >
              {column.label}
            </span>
          ))}
        </div>
        {table.sections.map((section, sectionIndex) => (
          <div key={section.label ?? sectionIndex}>
            {section.label ? (
              <div
                className="border-rule bg-wash text-muted-foreground flex items-center justify-between border-t px-[10px] font-mono uppercase"
                style={{ height: row, fontSize: Math.round(text * 0.8) }}
              >
                <span>{section.label}</span>
                <span className="normal-case">{section.note}</span>
              </div>
            ) : null}
            {section.rows.map((entry) => (
              <div
                key={entry.key}
                className={cn(
                  "border-rule flex items-center border-t tabular-nums",
                  entry.muted && "text-muted-foreground",
                  entry.highlighted && "bg-wash",
                )}
                style={{ height: row, fontSize: text }}
              >
                {table.columns.map((column, index) => (
                  <span
                    key={column.key}
                    className={cn(
                      align(column.align),
                      column.grow
                        ? "min-w-0 flex-1 truncate font-semibold"
                        : "shrink-0",
                      (column.key === "position" || column.strong) &&
                        "font-expanded font-bold",
                      column.key === "position" && "ps-[10px]",
                      column.strong && "pe-[10px]",
                    )}
                    style={
                      column.grow ? undefined : { width: cellWidth(column.key) }
                    }
                  >
                    {entry.cells[index]}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ))}
        <div className="border-rule border-t" />
      </div>
      <Big px={22} ratio={1.5} className="text-muted-foreground mt-auto">
        {table.footer}
      </Big>
    </div>
  );
}
