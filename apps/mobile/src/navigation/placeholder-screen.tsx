import { useMessages } from "../i18n/locale-provider";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Text } from "../primitives/text";

export function PlaceholderScreen({ title }: { title: string }) {
  const m = useMessages();
  return (
    <Screen>
      <ScreenHeader title={title} />
      <Text tone="muted">{m.mobileHome.placeholder.comingSoon}</Text>
    </Screen>
  );
}
