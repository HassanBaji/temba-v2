import { Link } from "expo-router";

import { Screen } from "../../../src/primitives/screen";
import { Text } from "../../../src/primitives/text";

export default function Home() {
  return (
    <Screen>
      <Text size="h1" weight="bold">
        Home
      </Text>
      <Text tone="muted">Coming soon.</Text>
      {__DEV__ ? (
        <Link href="/gallery">
          <Text size="meta" weight="medium">
            Open the primitives gallery
          </Text>
        </Link>
      ) : null}
    </Screen>
  );
}
