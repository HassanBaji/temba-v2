import { Link } from "expo-router";

import { Screen } from "../src/primitives/screen";
import { Text } from "../src/primitives/text";
import { api } from "../src/trpc/react";

export default function Placeholder() {
  const invite = api.games.previewInviteLink.useQuery({
    token: "unknown-token",
  });

  return (
    <Screen>
      <Text size="eyebrow" tone="muted" mono uppercase>
        Temba
      </Text>
      <Text size="display" width="expanded" weight="bold">
        1,234.56
      </Text>
      <Text size="meta" tone="muted">
        {invite.isPending
          ? "Calling the API…"
          : invite.error
            ? `API error: ${invite.error.message}`
            : `API replied: ${invite.data.status}`}
      </Text>
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
