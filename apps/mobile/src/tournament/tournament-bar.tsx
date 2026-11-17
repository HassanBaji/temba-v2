import { spacing } from "@repo/design-tokens";
import { awaitsOrganizerTeams } from "@repo/domain/alone-teams";
import { leaveWaitlistAction } from "@repo/domain/game-copy";
import { isAmericano } from "@repo/domain/tournament-americano";
import {
  tournamentHomeView,
  type TournamentDetails,
} from "@repo/domain/tournament-details";
import type { Locale } from "@repo/i18n/locale";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";
import { openSeatCount } from "./alone-teams-model";

export type TournamentBarHandlers = {
  joinPending: boolean;
  leaveWaitlistPending: boolean;
  onJoin: () => void;
  onJoinWaitlist: () => void;
  onLeaveWaitlist: () => void;
};

export function tournamentBarActions(game: TournamentDetails, locale: Locale) {
  const view = tournamentHomeView(game, locale);
  // An Americano seats players alone: its own view offers the one-tap seat.
  const seats = !isAmericano(game.format, game.tournamentShape);
  return {
    join: seats && view.canJoin,
    waitlist: seats && view.canWaitlist,
    leaveWaitlist: game.isWaitlisted,
  };
}

export function TournamentBar({
  game,
  handlers,
  inset = true,
}: {
  game: TournamentDetails;
  handlers: TournamentBarHandlers;
  inset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const locale = useLocale();
  const m = useMessages();
  const actions = tournamentBarActions(game, locale);
  const alone = awaitsOrganizerTeams(game);
  const join = m.aloneTeams.join;

  if (!actions.join && !actions.waitlist && !actions.leaveWaitlist) {
    return null;
  }

  return (
    <View>
      <Hairline />
      <View
        style={{
          gap: 8,
          paddingHorizontal: spacing.surface,
          paddingTop: 12,
          paddingBottom: (inset ? insets.bottom : 0) + 12,
        }}
      >
        {actions.join && alone ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight="semibold" numberOfLines={1}>
                {join.seatsLeft(
                  openSeatCount(
                    game.registeredPlayers.length,
                    game.playersAllowed ?? null,
                  ),
                )}
              </Text>
              <Text size="meta" tone="muted" numberOfLines={1}>
                {join.footer}
              </Text>
            </View>
            <Button
              label={join.submit}
              size="lg"
              pending={handlers.joinPending}
              onPress={handlers.onJoin}
            />
          </View>
        ) : actions.join ? (
          <Button
            label={m.game.cta.join}
            size="lg"
            pending={handlers.joinPending}
            onPress={handlers.onJoin}
          />
        ) : null}
        {actions.waitlist ? (
          <Button
            label={m.game.cta.joinWaitlist}
            size="lg"
            pending={handlers.joinPending}
            onPress={handlers.onJoinWaitlist}
          />
        ) : null}
        {actions.leaveWaitlist ? (
          <Button
            label={leaveWaitlistAction(locale)}
            variant="outline"
            size="lg"
            pending={handlers.leaveWaitlistPending}
            onPress={handlers.onLeaveWaitlist}
          />
        ) : null}
      </View>
    </View>
  );
}
