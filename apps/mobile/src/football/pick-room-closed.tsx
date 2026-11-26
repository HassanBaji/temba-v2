import { useRouter, type Href } from "expo-router";

import { gamePath } from "../games/games-model";
import { useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

export function ClosedRoom({ gameId }: { gameId: string }) {
  const router = useRouter();
  const m = useMessages().football.pick;
  const fallback = gamePath(gameId) as Href;
  return (
    <Screen>
      <ScreenHeader nav="back" fallback={fallback} title={m.title} />
      <Surface style={{ gap: 4 }}>
        <Text weight="semibold">{m.closedTitle}</Text>
        <Text size="meta" tone="muted">
          {m.closedBody}
        </Text>
      </Surface>
      <Button
        label={m.backToGame}
        variant="outline"
        size="lg"
        onPress={() => router.replace(fallback)}
      />
    </Screen>
  );
}
