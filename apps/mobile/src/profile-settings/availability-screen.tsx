import { colors, radii } from "@repo/design-tokens";
import {
  PLAY_WINDOW_PARTS,
  PLAY_WINDOWS,
  type PlayWindow,
} from "@repo/domain/profile-details";
import { Check } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Block } from "../home/slot-block";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { slotOf } from "../lib/slot-of";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader, useLeaveScreen } from "../primitives/screen-header";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api, type RouterOutputs } from "../trpc/react";
import { playWindowGrid, togglePlayWindow } from "./settings-model";
import { SettingsGroup, SwitchRow } from "./settings-rows";

type Details = RouterOutputs["users"]["profileDetails"];

const CELL_HEIGHT = 52;
const DAY_COLUMN = 72;

function isPlayWindow(value: string): value is PlayWindow {
  return PLAY_WINDOWS.includes(value as PlayWindow);
}

function AvailabilityForm({ details }: { details: Details }) {
  const m = useMessages();
  const w = m.you.playWindows;
  const locale = useLocale();
  const toast = useToast();
  const utils = api.useUtils();
  const leave = useLeaveScreen("/profile/settings");
  const [windows, setWindows] = useState<PlayWindow[]>(() =>
    details.playWindows.filter(isPlayWindow),
  );
  const [seatAlerts, setSeatAlerts] = useState(details.seatAlerts);
  const save = api.users.setPlayWindows.useMutation({
    onSuccess: async () => {
      await utils.users.profileDetails.invalidate();
      toast.show(w.saved);
      leave();
    },
    onError: (error) => toast.show(error.message),
  });
  const grid = playWindowGrid(windows, locale);

  return (
    <>
      <View style={{ gap: 8 }}>
        <Text size="h2" weight="bold">
          {w.heading}
        </Text>
        <Text tone="muted">{w.body}</Text>
      </View>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <View style={{ width: DAY_COLUMN }} />
          {PLAY_WINDOW_PARTS.map((part) => (
            <View key={part} style={{ flex: 1, alignItems: "center" }}>
              <Text size="eyebrow" tone="muted" mono uppercase>
                {w.parts[part]}
              </Text>
            </View>
          ))}
        </View>
        {grid.map((row) => (
          <View
            key={row.day}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <Text size="meta" tone="muted" style={{ width: DAY_COLUMN }}>
              {row.label}
            </Text>
            {row.cells.map((cell) => (
              <Pressable
                key={cell.value}
                accessibilityRole="checkbox"
                accessibilityLabel={cell.spoken}
                accessibilityState={{ checked: cell.on }}
                disabled={save.isPending}
                onPress={() =>
                  setWindows((current) => togglePlayWindow(current, cell.value))
                }
                style={({ pressed }) => ({
                  flex: 1,
                  height: CELL_HEIGHT,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radii.md,
                  borderWidth: hairline,
                  borderColor: cell.on ? colors.ink : colors.rule,
                  backgroundColor: cell.on
                    ? colors.ink
                    : pressed
                      ? colors.wash
                      : colors.paper,
                })}
              >
                {cell.on ? <Check size={16} color={colors.paper} /> : null}
              </Pressable>
            ))}
          </View>
        ))}
        <Text size="eyebrow" tone="muted" style={{ marginTop: 8 }}>
          {w.note}
        </Text>
      </View>
      <SettingsGroup>
        <SwitchRow
          title={w.seatAlerts}
          sub={w.seatAlertsNote}
          value={seatAlerts}
          disabled={save.isPending}
          onChange={setSeatAlerts}
        />
      </SettingsGroup>
      <Button
        label={w.save}
        size="lg"
        pending={save.isPending}
        onPress={() => save.mutate({ playWindows: windows, seatAlerts })}
      />
    </>
  );
}

export function AvailabilityScreen() {
  const m = useMessages();
  const details = api.users.profileDetails.useQuery();
  return (
    <Screen>
      <ScreenHeader
        nav="back"
        fallback="/profile/settings"
        title={m.you.playWindows.title}
      />
      <Block
        slot={slotOf(details)}
        title={m.you.playWindows.title}
        skeletonHeight={360}
        onRetry={() => void details.refetch()}
      >
        {(data) => <AvailabilityForm details={data} />}
      </Block>
    </Screen>
  );
}
