import { spacing } from "@repo/design-tokens";
import { LEAVE_WAITLIST_ACTION } from "@repo/domain/game-copy";
import {
  tournamentHomeView,
  type TournamentDetails,
} from "@repo/domain/tournament-details";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";

export type TournamentBarHandlers = {
  joinPending: boolean;
  leaveWaitlistPending: boolean;
  onJoin: () => void;
  onJoinWaitlist: () => void;
  onLeaveWaitlist: () => void;
};

export function tournamentBarActions(game: TournamentDetails) {
  const view = tournamentHomeView(game);
  return {
    join: view.canJoin,
    waitlist: view.canWaitlist,
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
  const actions = tournamentBarActions(game);

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
        {actions.join ? (
          <Button
            label="Join"
            size="lg"
            pending={handlers.joinPending}
            onPress={handlers.onJoin}
          />
        ) : null}
        {actions.waitlist ? (
          <Button
            label="Join waitlist"
            size="lg"
            pending={handlers.joinPending}
            onPress={handlers.onJoinWaitlist}
          />
        ) : null}
        {actions.leaveWaitlist ? (
          <Button
            label={LEAVE_WAITLIST_ACTION}
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
