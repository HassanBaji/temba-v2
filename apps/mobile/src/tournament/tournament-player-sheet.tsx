import { kickAction } from "@repo/domain/game-copy";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { GuestMark } from "../primitives/guest-mark";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import type { TournamentPlayer } from "./tournament-model";

/** What the Organizer can do with one player: open their profile, or kick them. */
export function TournamentPlayerSheet({
  player,
  canOpenProfile,
  kickPending,
  onClose,
  onOpenProfile,
  onKick,
}: {
  player: TournamentPlayer | null;
  canOpenProfile: boolean;
  kickPending: boolean;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
  onKick: (userId: string) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  return (
    <Sheet visible={player != null} onClose={onClose}>
      {player ? (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar
              name={player.name}
              uri={player.image}
              size="lg"
              guest={player.guest}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size="lead" weight="semibold" numberOfLines={1}>
                {player.name}
              </Text>
              {player.guest ? <GuestMark /> : null}
              {player.level ? (
                <Text size="meta" tone="muted" numberOfLines={1}>
                  {m.mobilePlayer.played.levelLine(player.level)}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {canOpenProfile && !player.guest ? (
              <Button
                label={m.mobilePlayer.played.viewProfile}
                variant="outline"
                onPress={() => onOpenProfile(player.userId)}
              />
            ) : null}
            <Button
              label={kickAction(locale)}
              accessibilityLabel={m.mobileTournament.organizer.kickSr(
                player.name,
              )}
              variant="outline"
              disabled={kickPending}
              onPress={() => onKick(player.userId)}
            />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}
