import { invertedFocusPalettes, palettes } from "@repo/design-tokens";
import {
  STANDING_PDF_PAGE,
  STANDING_SQUARE_SIZE,
  type StandingShareCard,
  type StandingShareCardRow,
  type StandingShareColumn,
  type StandingShareTable,
} from "@repo/domain/standing-share";
import { View } from "react-native";

import { Big, InkCanvas, Label, Wordmark } from "../share-result/story-parts";
import { STORY_HEIGHT, STORY_WIDTH } from "../share-result/story-canvas";
import { SurfaceToneContext } from "../primitives/surface-context";
import { LightScheme } from "../theme/theme-provider";

/*
 * Design "Group standings" 2b–2e, drawn at export size: the cards are three
 * times the design's 360px frames, the page is A4 at 150 dpi. Share output
 * leaves the App, so it reads the light palettes in both schemes.
 */
const ink = invertedFocusPalettes.light;
const lightColors = palettes.light;

const PAD_X = 84;
const PAD_Y = 78;
const ROW_HEIGHT = 114;

function CardHead({ range }: { range: string | null }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <Wordmark mark={48} px={36} />
      {range ? (
        <Label px={30} tracking={0} tone="muted">
          {range}
        </Label>
      ) : null}
    </View>
  );
}

function CardRow({
  row,
  ruled,
}: {
  row: StandingShareCardRow;
  ruled: boolean;
}) {
  return (
    <SurfaceToneContext.Provider value={row.highlighted ? "paper" : "ink"}>
      <View
        style={{
          height: ROW_HEIGHT,
          flexDirection: "row",
          alignItems: "center",
          gap: 30,
          paddingHorizontal: 30,
          borderTopWidth: ruled ? 3 : 0,
          borderTopColor: ink.dimrule,
          borderRadius: row.highlighted ? 24 : 0,
          backgroundColor: row.highlighted ? ink.paper : undefined,
        }}
      >
        <Big px={45} width="expanded" weight="bold" style={{ width: 54 }}>
          {row.position}
        </Big>
        <Big
          px={42}
          weight="semibold"
          numberOfLines={1}
          style={{ flex: 1, minWidth: 0 }}
        >
          {row.name}
        </Big>
        {row.middle ? (
          <Big px={36} tone="muted">
            {row.middle}
          </Big>
        ) : null}
        <Big
          px={48}
          width="expanded"
          weight="bold"
          style={{ width: 150, textAlign: "right" }}
        >
          {row.value}
        </Big>
      </View>
    </SurfaceToneContext.Provider>
  );
}

function CardRows({ rows }: { rows: StandingShareCardRow[] }) {
  return (
    <View>
      {rows.map((row, index) => (
        <CardRow
          key={row.key}
          row={row}
          ruled={index > 0 && !row.highlighted && !rows[index - 1]?.highlighted}
        />
      ))}
    </View>
  );
}

function Empty({ text }: { text: string | null }) {
  return text ? (
    <Big px={42} tone="muted" style={{ marginTop: 60 }}>
      {text}
    </Big>
  ) : null;
}

/** Design 2b and 2d: 1080 × 1920. */
export function StandingStoryCard({ card }: { card: StandingShareCard }) {
  const lead = card.lead;
  return (
    <InkCanvas
      style={{
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        backgroundColor: ink.ink,
        paddingHorizontal: PAD_X,
        paddingVertical: PAD_Y,
      }}
    >
      <CardHead range={card.range} />
      <Big
        px={66}
        ratio={1}
        width="expanded"
        weight="bold"
        tone="muted"
        style={{ marginTop: 78 }}
      >
        {card.kicker}
      </Big>
      <Big
        px={lead ? 150 : 174}
        ratio={0.94}
        tracking={-0.04}
        width="expanded"
        weight="bold"
        style={{ marginTop: 18 }}
      >
        {card.title}
      </Big>
      {lead ? (
        <Big px={39} tone="muted" style={{ marginTop: 36 }}>
          {card.subtitle}
        </Big>
      ) : (
        <>
          <Big px={45} weight="semibold" style={{ marginTop: 42 }}>
            {card.subtitle}
          </Big>
          {card.caption ? (
            <Big px={39} tone="muted">
              {card.caption}
            </Big>
          ) : null}
        </>
      )}
      {lead ? (
        <View
          style={{
            marginTop: 78,
            paddingTop: 54,
            borderTopWidth: 3,
            borderTopColor: ink.dimrule,
          }}
        >
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 30 }}
          >
            <Big px={45} width="expanded" weight="bold" tone="muted">
              {lead.position}
            </Big>
            <Big
              px={60}
              weight="semibold"
              style={
                lead.highlighted
                  ? { textDecorationLine: "underline" }
                  : undefined
              }
            >
              {lead.name}
            </Big>
          </View>
          <Big
            px={288}
            ratio={0.95}
            tracking={-0.04}
            width="expanded"
            weight="bold"
            style={{ marginTop: 24 }}
          >
            {lead.value}
          </Big>
          {lead.line ? (
            <Big px={39} tone="muted" style={{ marginTop: 24 }}>
              {lead.line}
            </Big>
          ) : null}
        </View>
      ) : null}
      {card.columns ? (
        <View
          style={{
            marginTop: 66,
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: 30,
            paddingHorizontal: 30,
            paddingBottom: 18,
          }}
        >
          <Label px={27} tracking={0} tone="muted">
            {card.columns.middle}
          </Label>
          <Label
            px={27}
            tracking={0}
            tone="muted"
            style={{ width: 150, textAlign: "right" }}
          >
            {card.columns.value}
          </Label>
        </View>
      ) : null}
      <View style={card.columns ? undefined : { marginTop: 66 }}>
        <CardRows rows={card.rows} />
        {lead ? null : <Empty text={card.empty} />}
      </View>
      <View
        style={{
          marginTop: "auto",
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <Big px={33} tone="muted">
          {card.footStart}
        </Big>
        {card.footEnd ? (
          <Big px={33} tone="muted">
            {card.footEnd}
          </Big>
        ) : null}
      </View>
    </InkCanvas>
  );
}

/** Design 2c: 1080 × 1080. */
export function StandingSquareCard({ card }: { card: StandingShareCard }) {
  return (
    <InkCanvas
      style={{
        width: STANDING_SQUARE_SIZE,
        height: STANDING_SQUARE_SIZE,
        backgroundColor: ink.ink,
        paddingHorizontal: PAD_X,
        paddingVertical: PAD_Y,
      }}
    >
      <CardHead range={card.range} />
      <View
        style={{
          marginTop: 48,
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <Big
          px={102}
          ratio={1}
          tracking={-0.04}
          width="expanded"
          weight="bold"
          numberOfLines={1}
          style={{ flexShrink: 1 }}
        >
          {card.title}
        </Big>
        <Big px={39} width="expanded" weight="bold" tone="muted">
          {card.kicker}
        </Big>
      </View>
      <Big px={36} tone="muted" style={{ marginTop: 12 }}>
        {card.subtitle}
      </Big>
      <View style={{ marginTop: 36 }}>
        <CardRows rows={card.rows} />
        <Empty text={card.empty} />
      </View>
      <Big px={33} tone="muted" style={{ marginTop: "auto" }}>
        {card.footStart}
      </Big>
    </InkCanvas>
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
      return 92;
    case "change":
      return 170;
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

function cellStyle(column: StandingShareColumn) {
  return {
    ...(column.grow
      ? { flex: 1, minWidth: 0 }
      : { width: cellWidth(column.key) }),
    textAlign:
      column.align === "start"
        ? ("left" as const)
        : column.align === "center"
          ? ("center" as const)
          : ("right" as const),
    paddingStart: column.key === "position" ? 10 : 0,
    paddingEnd: column.strong ? 10 : 0,
  };
}

/** Design 2e: one A4 page with every player and every column. */
export function StandingPdfPage({ table }: { table: StandingShareTable }) {
  const rowCount = table.sections.reduce(
    (total, section) =>
      total + section.rows.length + (section.label != null ? 1 : 0),
    1,
  );
  const scale = Math.max(0.45, Math.min(1, PAGE_ROOM / (rowCount * PAGE_ROW)));
  const row = Math.round(PAGE_ROW * scale);
  const text = Math.round(29 * Math.max(scale, 0.7));
  return (
    <LightScheme>
      <SurfaceToneContext.Provider value="paper">
        <View
          style={{
            width: STANDING_PDF_PAGE.width,
            height: STANDING_PDF_PAGE.height,
            backgroundColor: lightColors.paper,
            paddingHorizontal: PAGE_PAD,
            paddingTop: PAGE_PAD,
            paddingBottom: 68,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
            }}
          >
            <Wordmark mark={36} px={30} />
            {table.range ? (
              <Label px={22} tracking={0} tone="muted">
                {table.range}
              </Label>
            ) : null}
          </View>
          <Big
            px={68}
            ratio={1}
            tracking={-0.02}
            width="expanded"
            weight="bold"
            style={{ marginTop: 54 }}
          >
            {table.title}
          </Big>
          <Big px={29} tone="muted" style={{ marginTop: 16 }}>
            {table.subtitle}
          </Big>
          <View style={{ marginTop: 48 }}>
            <View
              style={{
                height: Math.round(60 * Math.max(scale, 0.7)),
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {table.columns.map((column) => (
                <Label
                  key={column.key}
                  px={22}
                  tracking={0}
                  tone={column.strong ? "default" : "muted"}
                  uppercase
                  style={cellStyle(column)}
                >
                  {column.label}
                </Label>
              ))}
            </View>
            {table.sections.map((section, sectionIndex) => (
              <View key={section.label ?? sectionIndex}>
                {section.label ? (
                  <View
                    style={{
                      height: row,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: 10,
                      borderTopWidth: 1,
                      borderTopColor: lightColors.rule,
                      backgroundColor: lightColors.wash,
                    }}
                  >
                    <Label
                      px={Math.round(text * 0.8)}
                      tracking={0}
                      tone="muted"
                      uppercase
                    >
                      {section.label}
                    </Label>
                    <Label
                      px={Math.round(text * 0.8)}
                      tracking={0}
                      tone="muted"
                    >
                      {section.note}
                    </Label>
                  </View>
                ) : null}
                {section.rows.map((entry) => (
                  <View
                    key={entry.key}
                    style={{
                      height: row,
                      flexDirection: "row",
                      alignItems: "center",
                      borderTopWidth: 1,
                      borderTopColor: lightColors.rule,
                      backgroundColor: entry.highlighted
                        ? lightColors.wash
                        : undefined,
                    }}
                  >
                    {table.columns.map((column, index) => (
                      <Big
                        key={column.key}
                        px={text}
                        ratio={1.2}
                        tone={entry.muted ? "muted" : "default"}
                        width={
                          column.key === "position" || column.strong
                            ? "expanded"
                            : undefined
                        }
                        weight={
                          column.key === "position" || column.strong
                            ? "bold"
                            : column.grow
                              ? "semibold"
                              : "regular"
                        }
                        numberOfLines={1}
                        style={cellStyle(column)}
                      >
                        {entry.cells[index]}
                      </Big>
                    ))}
                  </View>
                ))}
              </View>
            ))}
            <View
              style={{ borderTopWidth: 1, borderTopColor: lightColors.rule }}
            />
          </View>
          <Big px={22} ratio={1.5} tone="muted" style={{ marginTop: "auto" }}>
            {table.footer}
          </Big>
        </View>
      </SurfaceToneContext.Provider>
    </LightScheme>
  );
}
