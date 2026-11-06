import type { FriendlyGameDetailsSide } from "@repo/domain/friendly-game-details";
import {
  joinSideHelp,
  joinSideOptions,
  viewerSideChoice,
  viewerTeam,
  type SideChoice,
  type SidesTeam,
} from "@repo/domain/padel-sides";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { SidePicker } from "./side-picker";

/** The viewer's Game team with their own seat cleared, as a joiner would see it. */
function teamWithoutViewer(
  sides: readonly FriendlyGameDetailsSide[],
  viewerUserId: string,
): SidesTeam | null {
  const seat = viewerTeam(sides, viewerUserId);
  if (!seat) {
    return null;
  }
  return { ...seat.team, [seat.position]: null };
}

/** J2's Pick a side: a seated User picks Left, Right or Either before the Game. */
export function PickSideSheet({
  visible,
  sides,
  viewerUserId,
  pending,
  error,
  onClose,
  onSave,
}: {
  visible: boolean;
  sides: readonly FriendlyGameDetailsSide[];
  viewerUserId: string;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (side: SideChoice) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const current = viewerSideChoice(sides, viewerUserId);
  const [side, setSide] = useState<SideChoice | null>(current);

  useEffect(() => {
    if (visible) {
      setSide(current);
    }
    // Reset only when the sheet opens; the Game may change while it is open.
  }, [visible]);

  const team = teamWithoutViewer(sides, viewerUserId);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={m.game.sides.pickASide}
      subtitle={m.game.sides.pickSideDescription}
    >
      <View style={{ gap: 16 }}>
        {error ? (
          <Text size="meta" weight="medium" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <SidePicker
          options={joinSideOptions(team, locale)}
          selected={side}
          onSelect={setSide}
        />
        {side ? (
          <Text size="meta" tone="muted" accessibilityLiveRegion="polite">
            {joinSideHelp(team, side, locale)}
          </Text>
        ) : null}
        <Button
          label={m.game.sides.saveSide}
          size="lg"
          disabled={side == null || side === current}
          pending={pending}
          onPress={() => side && onSave(side)}
        />
      </View>
    </Sheet>
  );
}
