import { colors } from "@repo/design-tokens";
import {
  formatDayMonth,
  formatGameCardDay,
} from "@repo/domain/format-game-start";
import {
  footballBibName,
  footballSlotCode,
  isFootballBib,
  type FootballBib,
} from "@repo/domain/football-lineup";
import { sideSizeLabel } from "@repo/domain/game-shape";
import { formatHomeKickoff } from "@repo/domain/home-countdown";
import type {
  HubGameFootballSide,
  HubGameRow,
} from "@repo/domain/hub-game-row";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import { View } from "react-native";

import { BibChip } from "../football/bib-picker";
import { SeatBar } from "../game-details/football-hero";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Text } from "../primitives/text";
import { CardFooter, CardShell } from "./card-parts";
import { footballSection } from "./games-model";
import { useNow } from "./use-now";

export type FootballCardActions = {
  onOpen: (gameId: string) => void;
  onJoin: (gameId: string) => void;
  onJoinWaitlist: (game: HubGameRow) => void;
  onEnterScore: (gameId: string) => void;
  onConfirm: (gameId: string, matchId: string) => void;
};

const AVATAR_OVERLAP = -6;

function bibOf(side: HubGameFootballSide): FootballBib {
  return isFootballBib(side.bib)
    ? side.bib
    : side.sideIndex === 1
      ? "black"
      : "white";
}

function SizeTag({ sideSize }: { sideSize: number | null }) {
  return sideSize ? (
    <Text size="eyebrow" tone="muted" mono>
      {sideSizeLabel(sideSize).toUpperCase()}
    </Text>
  ) : null;
}

function Kickoff({ game }: { game: HubGameRow }) {
  const kickoff = formatHomeKickoff(game.startTime);
  const place = [game.venue?.name, game.courtName].filter(Boolean).join(", ");
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
        <Text size="h2" width="expanded" weight="bold">
          {kickoff.time}
        </Text>
        <Text size="meta" tone="muted">
          {kickoff.meridiem}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold" numberOfLines={2}>
          {place.length > 0 ? place : (game.name ?? "Football")}
        </Text>
        <Text size="meta" tone="muted">
          {formatGameCardDay(game.startTime)}
        </Text>
      </View>
      <SizeTag sideSize={game.football?.sideSize ?? null} />
    </View>
  );
}

function SideLine({ side }: { side: HubGameFootballSide }) {
  const bib = bibOf(side);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View
        style={{
          width: 64,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
      >
        <BibChip bib={bib} />
        <Text size="meta" weight="semibold" numberOfLines={1}>
          {footballBibName(bib, side.sideIndex)}
        </Text>
      </View>
      <View style={{ flex: 1, flexDirection: "row", overflow: "hidden" }}>
        {side.members.map((member, index) => (
          <View
            key={member.userId}
            style={{
              marginLeft: index === 0 ? 0 : AVATAR_OVERLAP,
              borderRadius: 999,
              borderWidth: 2,
              borderColor: colors.paper,
            }}
          >
            <Avatar name={member.name} uri={member.image} size="sm" />
          </View>
        ))}
      </View>
      <Text size="meta" tone="muted">
        {side.members.length}
      </Text>
    </View>
  );
}

function ResultBody({ game }: { game: HubGameRow }) {
  const football = game.football!;
  const sides = football.sides ?? [];
  const score = football.score;
  const viewerSide = football.viewer.sideIndex;
  const side = (index: 1 | 2) => sides.find((row) => row.sideIndex === index);
  const name = (index: 1 | 2) => {
    const row = side(index);
    return row
      ? footballBibName(bibOf(row), index)
      : index === 1
        ? "Black"
        : "White";
  };
  const note = (index: 1 | 2) => (viewerSide === index ? "You played" : null);
  const chip = (index: 1 | 2) => {
    const row = side(index);
    return row ? <BibChip bib={bibOf(row)} size={24} /> : null;
  };
  return (
    <>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text size="meta" tone="muted">
          {[
            formatDayMonth(game.startTime, { weekday: "short" }),
            game.venue?.name,
          ]
            .filter(Boolean)
            .join(", ")}
        </Text>
        <SizeTag sideSize={football.sideSize} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {chip(1)}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold">{name(1)}</Text>
          {note(1) ? (
            <Text size="meta" tone="muted">
              {note(1)}
            </Text>
          ) : null}
        </View>
        <Text size="h1" width="expanded" weight="bold">
          {score ? `${score.slot1} – ${score.slot2}` : "– –"}
        </Text>
        <View style={{ flex: 1, minWidth: 0, alignItems: "flex-end" }}>
          <Text weight="semibold">{name(2)}</Text>
          {note(2) ? (
            <Text size="meta" tone="muted">
              {note(2)}
            </Text>
          ) : null}
        </View>
        {chip(2)}
      </View>
    </>
  );
}

function OpenBody({ game }: { game: HubGameRow }) {
  const sideSize = game.football?.sideSize ?? 5;
  const seats = sideSize * 2;
  const taken = game.registeredUserCount;
  const open = Math.max(0, seats - taken);
  return (
    <>
      <Kickoff game={game} />
      <SeatBar seats={seats} filled={taken} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text size="meta">
          <Text size="meta" weight="semibold">
            {Math.min(taken, seats)} of {seats}
          </Text>{" "}
          <Text size="meta" tone="muted">
            {open > 0 ? `in, ${open} open` : "in"}
          </Text>
        </Text>
        <Text size="meta" tone="muted">
          {taken > seats ? `${taken - seats} on the bench` : "Teams not set"}
        </Text>
      </View>
    </>
  );
}

function TeamsBody({ game }: { game: HubGameRow }) {
  const football = game.football!;
  const viewerSide = football.sides?.find(
    (side) => side.sideIndex === football.viewer.sideIndex,
  );
  const code = footballSlotCode(football.viewer.role, football.viewer.position);
  return (
    <>
      <Kickoff game={game} />
      <View style={{ gap: 6 }}>
        {football.sides?.map((side) => (
          <SideLine key={side.sideIndex} side={side} />
        ))}
      </View>
      {viewerSide ? (
        <Text size="meta">
          <Text size="meta" weight="semibold">
            You play in{" "}
            {footballBibName(bibOf(viewerSide), viewerSide.sideIndex)}
          </Text>
          {code ? (
            <Text size="meta" tone="muted">
              {" "}
              as {code}
            </Text>
          ) : null}
        </Text>
      ) : null}
    </>
  );
}

export function FootballGameCard({
  game,
  pending,
  actions,
}: {
  game: HubGameRow;
  pending: boolean;
  actions: FootballCardActions;
}) {
  const now = useNow();
  const football = game.football!;
  const section = footballSection(game, now);
  const price = formatPricePerPlayerFils(game.pricePerPlayerFils);
  const kickoff = formatHomeKickoff(game.startTime);
  const label = `${game.venue?.name ?? "Football"}, ${formatGameCardDay(game.startTime)} ${kickoff.time} ${kickoff.meridiem}`;

  let footer: React.ReactNode = null;
  if (section === "result") {
    const matchId = football.matchId;
    footer = (
      <CardFooter>
        <Text size="meta" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
          {football.score
            ? football.enteredByName
              ? `Entered by ${football.enteredByName}`
              : "Score in"
            : "Score missing"}
        </Text>
        {football.score && matchId ? (
          <Button
            label="Confirm"
            size="sm"
            variant="outline"
            pending={pending}
            onPress={() => actions.onConfirm(game.id, matchId)}
          />
        ) : (
          <Button
            label="Enter score"
            size="sm"
            onPress={() => actions.onEnterScore(game.id)}
          />
        )}
      </CardFooter>
    );
  } else if (section === "open" || section === "full") {
    const action = game.canRegister ? (
      <Button label="Join" size="sm" onPress={() => actions.onJoin(game.id)} />
    ) : game.canWaitlist ? (
      <Button
        label="Join waitlist"
        size="sm"
        variant="outline"
        pending={pending}
        onPress={() => actions.onJoinWaitlist(game)}
      />
    ) : game.isRegistered ? (
      <Text size="meta" weight="semibold">
        You&apos;re in
      </Text>
    ) : game.isWaitlisted ? (
      <Text size="meta" weight="semibold">
        On the waitlist
      </Text>
    ) : null;
    footer = (
      <CardFooter>
        <Text size="meta" tone="muted" style={{ flex: 1 }}>
          {price ? (
            <>
              <Text weight="semibold">{price}</Text>
              {price === "Free" ? "" : " each"}
            </>
          ) : (
            (game.groupName ?? "")
          )}
        </Text>
        {action}
      </CardFooter>
    );
  } else {
    footer = (
      <CardFooter>
        <Text size="meta" tone="muted" style={{ flex: 1 }}>
          {football.sideSize
            ? `${football.sideSize} start, captains pick`
            : "Captains pick starters"}
        </Text>
        <Button
          label="Open"
          size="sm"
          variant="outline"
          onPress={() => actions.onOpen(game.id)}
        />
      </CardFooter>
    );
  }

  return (
    <CardShell
      label={label}
      onPress={() => actions.onOpen(game.id)}
      footer={footer}
    >
      {section === "result" ? (
        <ResultBody game={game} />
      ) : section === "teams" ? (
        <TeamsBody game={game} />
      ) : (
        <OpenBody game={game} />
      )}
    </CardShell>
  );
}
