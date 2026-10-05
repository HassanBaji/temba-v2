import { Screen } from "../primitives/screen";
import { Text } from "../primitives/text";

export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <Screen>
      <Text size="h1" weight="bold">
        {title}
      </Text>
      <Text tone="muted">Coming soon.</Text>
    </Screen>
  );
}
