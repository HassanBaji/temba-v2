import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Text } from "../primitives/text";

export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <Screen>
      <ScreenHeader title={title} />
      <Text tone="muted">Coming soon.</Text>
    </Screen>
  );
}
