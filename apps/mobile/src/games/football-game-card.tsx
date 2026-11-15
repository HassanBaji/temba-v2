import { bibColors } from "@repo/design-tokens";
import {
  formatGameDay,
  formatGameCardDay,
} from "@repo/domain/format-game-start";
import {
  footballBibName,
  footballSlotCode,
  isFootballBib,
  type FootballBib,
} from "@repo/domain/football-lineup";
import { gameCustomName } from "@repo/domain/game-custom-name";
import { ratingScopeTag } from "@repo/domain/game-rating-impact";
import { isPublicGame } from "@repo/domain/game-rating-scope";
import { sideSizeLabel } from "@repo/domain/game-shape";
import { footballSection } from "@repo/domain/football-hub";
import { formatHomeKickoff } from "@repo/domain/home-countdown";
import type {
  HubGameFootballSide,
  HubGameRow,
} from "@repo/domain/hub-game-row";
import { formatLevelRangeLabel } from "@repo/domain/level-range";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import { View } from "react-native";

import { BibChip } from "../football/bib-picker";
import { SeatBar } from "../game-details/football-hero";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { ScorePair } from "../primitives/score-pair";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { CardFooter, CardShell, ChallengeMarker } from "./card-parts";
import { useNow } from "./use-now";

export type FootballCardActions = {
  onOpen: (gameId: string) => void;
  onJoin: (gameId: string) => void;
  onJoinWaitlist: (game: HubGameRow) => void;
  onEnterScore: (gameId: string) => void;
  onConfirm: (gameId: string, matchId: string) => void;
};

const DISC = 22;
const DISC_OVERLAP = -4;

function bibOf(side: HubGameFootballSide): FootballBib {
  return isFootballBib(side.bib)
    ? side.bib
    : side.sideIndex === 1
      ? "black"
      : "white";
}

function SizeTag({ sideSize }: { sideSize: number | null }) {
  const locale = useLocale();
  return sideSize ? (
    <Text size="eyebrow" tone="muted" mono>
      {sideSizeLabel(sideSize, locale).toUpperCase()}
    </Text>
  ) : null;
}

function Kickoff({ game }: { game: HubGameRow }) {
  const locale = useLocale();
  const m = useMessages();
  const kickoff = formatHomeKickoff(game.startTime, locale);
  const customName = gameCustomName(game);
  const place = [game.venue?.name, game.courtName].filter(
    (part): part is string => Boolean(part),
  );
  const day = formatGameCardDay(game.startTime, locale);
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
          {customName ??
            (place.length > 0
              ? m.home.comingUp.parts(place)
              : m.common.football)}
        </Text>
        <Text size="meta" tone="muted">
          {customName ? m.home.comingUp.parts([...place, day]) : day}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        {game.challenge ? <ChallengeMarker /> : null}
        <SizeTag sideSize={game.football?.sideSize ?? null} />
      </View>
    </View>
  );
}

function SideLine({ side }: { side: HubGameFootballSide }) {
  const locale = useLocale();
  const colors = useColors();
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
          {footballBibName(bib, side.sideIndex, locale)}
        </Text>
      </View>
      <View
        accessible
        accessibilityLabel={side.members
          .map((member) => member.name)
          .join(", ")}
        style={{ flex: 1, flexDirection: "row", overflow: "hidden" }}
      >
        {side.members.map((member, index) => (
          <View
            key={member.userId}
            style={{
              width: DISC,
              height: DISC,
              marginStart: index === 0 ? 0 : DISC_OVERLAP,
              borderRadius: DISC / 2,
              backgroundColor: bibColors[bib].fill,
              borderWidth: 2,
              borderColor: colors.paper,
            }}
          />
        ))}
      </View>
      <Text size="meta" tone="muted">
        {side.members.length}
      </Text>
    </View>
  );
}

function ResultBody({ game }: { game: HubGameRow }) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.mobileTournament.footballCard;
  const football = game.football!;
  const sides = football.sides ?? [];
  const score = football.score;
  const viewerSide = football.viewer.sideIndex;
  const side = (index: 1 | 2) => sides.find((row) => row.sideIndex === index);
  const name = (index: 1 | 2) => {
    const row = side(index);
    return row
      ? footballBibName(bibOf(row), index, locale)
      : index === 1
        ? messages.football.lineup.bibs.black
        : messages.football.lineup.bibs.white;
  };
  const note = (index: 1 | 2) => (viewerSide === index ? m.youPlayed : null);
  const chip = (index: 1 | 2) => {
    const row = side(index);
    return row ? <BibChip bib={bibOf(row)} size={24} /> : null;
  };
  return (
    <>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text size="meta" tone="muted">
          {messages.home.comingUp.parts(
            [
              formatGameDay(game.startTime, locale, { weekday: "short" }),
              game.venue?.name,
            ].filter((part): part is string => Boolean(part)),
          )}
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
        {score ? (
          <ScorePair
            own={score.slot1}
            other={score.slot2}
            size="h1"
            width="expanded"
            weight="bold"
          />
        ) : (
          <Text size="h1" width="expanded" weight="bold">
            – –
          </Text>
        )}
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

/** A Public Game says it counts for Temba Level; any Game says who may join. */
function ScopeLine({ game }: { game: HubGameRow }) {
  const locale = useLocale();
  const tag = isPublicGame(game)
    ? ratingScopeTag({ ...game, publicGame: true }, locale)
    : null;
  const range = formatLevelRangeLabel(
    game.levelMinTenths,
    game.levelMaxTenths,
    locale,
    game.sport,
  );
  if (!tag && !range) {
    return null;
  }
  return (
    <View
      style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}
    >
      <Text size="meta" weight="semibold" numberOfLines={1}>
        {tag ?? ""}
      </Text>
      {range ? (
        <Text size="meta" tone="muted" numberOfLines={1}>
          {range}
        </Text>
      ) : null}
    </View>
  );
}

function OpenBody({ game }: { game: HubGameRow }) {
  const m = useMessages().football.hub.card;
  const seats = game.playersAllowed ?? (game.football?.sideSize ?? 5) * 2;
  const taken = game.registeredUserCount;
  const open = Math.max(0, seats - taken);
  return (
    <>
      <Kickoff game={game} />
      <SeatBar seats={seats} filled={taken} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text size="meta">
          <Text size="meta" weight="semibold">
            {m.playersOf(Math.min(taken, seats), seats)}
          </Text>
          {open > 0 ? (
            <Text size="meta" tone="muted">
              {m.openSpots(open)}
            </Text>
          ) : null}
        </Text>
        <Text size="meta" tone="muted">
          {m.waitingForPlayers}
        </Text>
      </View>
    </>
  );
}

function TeamsBody({ game }: { game: HubGameRow }) {
  const locale = useLocale();
  const m = useMessages().mobileTournament.footballCard;
  const football = game.football!;
  const viewerSide = football.sides?.find(
    (side) => side.sideIndex === football.viewer.sideIndex,
  );
  const code = footballSlotCode(
    football.viewer.role,
    football.viewer.position,
    locale,
  );
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
            {m.youPlayIn(
              footballBibName(bibOf(viewerSide), viewerSide.sideIndex, locale),
            )}
          </Text>
          {code ? (
            <Text size="meta" tone="muted">
              {" "}
              {m.asCode(code)}
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
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.mobileTournament.footballCard;
  const football = game.football!;
  const section = footballSection(game, now);
  const price = formatPricePerPlayerFils(game.pricePerPlayerFils, locale);
  const kickoff = formatHomeKickoff(game.startTime, locale);
  const label = messages.mobileTournament.card.accessibleName(
    game.venue?.name ?? messages.common.football,
    formatGameCardDay(game.startTime, locale),
    `${kickoff.time} ${kickoff.meridiem}`,
  );

  let footer: React.ReactNode = null;
  if (section === "result") {
    const matchId = football.matchId;
    footer = (
      <CardFooter>
        <Text size="meta" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
          {football.score
            ? football.enteredByName
              ? m.enteredBy(football.enteredByName)
              : m.scoreIn
            : m.scoreMissing}
        </Text>
        {football.score && matchId ? (
          <Button
            label={messages.common.confirm}
            size="sm"
            variant="outline"
            pending={pending}
            onPress={() => actions.onConfirm(game.id, matchId)}
          />
        ) : (
          <Button
            label={m.enterScore}
            size="sm"
            onPress={() => actions.onEnterScore(game.id)}
          />
        )}
      </CardFooter>
    );
  } else if (section === "open" || section === "full") {
    const action = game.canRegister ? (
      <Button
        label={messages.game.cta.join}
        size="sm"
        onPress={() => actions.onJoin(game.id)}
      />
    ) : game.canWaitlist ? (
      <Button
        label={messages.game.cta.joinWaitlist}
        size="sm"
        variant="outline"
        pending={pending}
        onPress={() => actions.onJoinWaitlist(game)}
      />
    ) : game.isRegistered ? (
      <Text size="meta" weight="semibold">
        {messages.game.cta.youreIn}
      </Text>
    ) : game.isWaitlisted ? (
      <Text size="meta" weight="semibold">
        {messages.game.partner.onTheWaitlist}
      </Text>
    ) : null;
    footer = (
      <CardFooter>
        <Text size="meta" tone="muted" style={{ flex: 1 }}>
          {price ? (
            <>
              <Text weight="semibold">{price}</Text>
              {price === messages.createGame.price.free ? "" : ` ${m.each}`}
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
            ? m.startCaptainsPick(football.sideSize)
            : m.captainsPickStarters}
        </Text>
        <Button
          label={messages.common.open}
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
      {section === "result" ? null : <ScopeLine game={game} />}
    </CardShell>
  );
}
