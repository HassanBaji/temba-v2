import { invertedFocusPalettes } from "@repo/design-tokens";
import { formatAloneLevel } from "@repo/domain/alone-teams";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { initialsFor } from "../primitives/initials";
import { STORY_HEIGHT, STORY_WIDTH } from "../share-result/story-canvas";
import {
  Big,
  InitialsSquare,
  InkCanvas,
  Label,
  Wordmark,
} from "../share-result/story-parts";
import type { ShareTeam } from "./alone-teams-model";

// Share cards render on black in both modes: they leave the App.
const colors = invertedFocusPalettes.light;

export const SQUARE_SIZE = STORY_WIDTH;

const RULE = 1;

export type TeamsCardModel = {
  gameName: string;
  meta: string;
  teams: readonly ShareTeam[];
  showLevels: boolean;
  venue: string | null;
  day: string | null;
  time: string | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function Head() {
  const m = useMessages().aloneTeams.share;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <Wordmark mark={48} px={34} />
      <Label
        px={20}
        tone="muted"
        uppercase
        numberOfLines={1}
        style={{ flexShrink: 1 }}
      >
        {m.eyebrow}
      </Label>
    </View>
  );
}

function Average({ value, px }: { value: number | null; px: number }) {
  const locale = useLocale();
  return (
    <Big px={px} weight="semibold" ltr style={{ color: colors.onControlMuted }}>
      {formatAloneLevel(value, locale)}
    </Big>
  );
}

/** The story image of Share teams: every pair on one 1080 × 1920 card. */
export function TeamsStoryCard({ model }: { model: TeamsCardModel }) {
  const m = useMessages().aloneTeams.share;
  const count = Math.max(model.teams.length, 1);
  const rowHeight = clamp(Math.floor(980 / count), 56, 112);
  const namePx = clamp(Math.round(rowHeight * 0.36), 22, 38);
  const square = clamp(Math.round(rowHeight * 0.5), 32, 52);
  return (
    <InkCanvas
      style={{
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        backgroundColor: colors.ink,
        paddingHorizontal: 72,
        paddingTop: 140,
        paddingBottom: 120,
        gap: 40,
      }}
    >
      <Head />
      <View style={{ gap: 20 }}>
        <Big
          px={128}
          ratio={0.95}
          tracking={-0.03}
          width="expanded"
          weight="bold"
          numberOfLines={2}
        >
          {model.gameName}
        </Big>
        <Label px={22} tone="muted" uppercase numberOfLines={1}>
          {model.meta}
        </Label>
      </View>
      <View
        style={{
          borderTopWidth: RULE,
          borderTopColor: colors.controlRule,
          paddingTop: 24,
          gap: 8,
        }}
      >
        <Label px={20} tone="muted" uppercase>
          {m.theTeams}
        </Label>
        {model.teams.map((team, index) => (
          <View
            key={team.gameTeamId}
            style={{
              height: rowHeight,
              flexDirection: "row",
              alignItems: "center",
              gap: 20,
              borderBottomWidth: RULE,
              borderBottomColor: colors.controlRule,
            }}
          >
            <Label px={20} tone="muted" style={{ width: 40 }}>
              {String(index + 1).padStart(2, "0")}
            </Label>
            {[team.left, team.right].map((player) => (
              <View
                key={player.userId}
                style={{
                  flex: 1,
                  minWidth: 0,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <InitialsSquare
                  init={initialsFor(player.name)}
                  size={square}
                  radius={Math.round(square / 4)}
                  px={Math.round(square * 0.36)}
                  variant="outline"
                />
                <Big
                  px={namePx}
                  weight="semibold"
                  numberOfLines={1}
                  style={{ flexShrink: 1 }}
                >
                  {player.name}
                </Big>
              </View>
            ))}
            {model.showLevels ? (
              <Average value={team.average} px={namePx} />
            ) : null}
          </View>
        ))}
      </View>
      <View
        style={{
          marginTop: "auto",
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <Big
          px={36}
          weight="semibold"
          numberOfLines={2}
          style={{ flexShrink: 1 }}
        >
          {model.venue ?? ""}
        </Big>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          {model.day ? (
            <Big px={36} weight="semibold">
              {model.day}
            </Big>
          ) : null}
          {model.time ? (
            <Big px={26} tone="muted">
              {model.time}
            </Big>
          ) : null}
        </View>
      </View>
    </InkCanvas>
  );
}

/** The square image of Share teams, for the group chat: pairs in two columns. */
export function TeamsSquareCard({ model }: { model: TeamsCardModel }) {
  const perColumn = Math.max(Math.ceil(model.teams.length / 2), 1);
  const cellHeight = clamp(Math.floor(560 / perColumn), 64, 140);
  const namePx = clamp(Math.round(cellHeight * 0.24), 20, 32);
  const columns = [
    model.teams.slice(0, perColumn),
    model.teams.slice(perColumn),
  ];
  return (
    <InkCanvas
      style={{
        width: SQUARE_SIZE,
        height: SQUARE_SIZE,
        backgroundColor: colors.ink,
        padding: 64,
        gap: 36,
      }}
    >
      <Head />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 32,
        }}
      >
        <Big
          px={84}
          ratio={0.95}
          tracking={-0.03}
          width="expanded"
          weight="bold"
          numberOfLines={2}
          style={{ flex: 1, minWidth: 0 }}
        >
          {model.gameName}
        </Big>
        <View style={{ alignItems: "flex-end", gap: 4, maxWidth: 340 }}>
          {[model.day, model.time, model.venue]
            .filter((line): line is string => Boolean(line))
            .map((line) => (
              <Big
                key={line}
                px={24}
                tone="muted"
                numberOfLines={2}
                style={{ textAlign: "right" }}
              >
                {line}
              </Big>
            ))}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 40 }}>
        {columns.map((column, columnIndex) => (
          <View key={columnIndex} style={{ flex: 1, minWidth: 0 }}>
            {column.map((team, index) => (
              <View
                key={team.gameTeamId}
                style={{
                  height: cellHeight,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 18,
                  borderTopWidth: RULE,
                  borderTopColor: colors.controlRule,
                }}
              >
                <Label px={18} tone="muted" style={{ width: 34 }}>
                  {String(columnIndex * perColumn + index + 1).padStart(2, "0")}
                </Label>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Big px={namePx} weight="semibold" numberOfLines={1}>
                    {team.left.name}
                  </Big>
                  <Big px={namePx} weight="semibold" numberOfLines={1}>
                    {team.right.name}
                  </Big>
                </View>
                {model.showLevels ? (
                  <Average value={team.average} px={namePx} />
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </View>
    </InkCanvas>
  );
}
