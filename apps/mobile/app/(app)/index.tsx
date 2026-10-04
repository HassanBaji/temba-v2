import { useAuth } from "@clerk/expo";
import { Link } from "expo-router";
import { useState } from "react";

import { Button } from "../../src/primitives/button";
import { Screen } from "../../src/primitives/screen";
import { Text } from "../../src/primitives/text";

export default function SignedIn() {
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <Screen>
      <Text size="eyebrow" tone="muted" mono uppercase>
        Temba
      </Text>
      <Text size="h1" weight="bold">
        You are signed in
      </Text>
      {__DEV__ ? (
        <Link href="/gallery">
          <Text size="meta" weight="medium">
            Open the primitives gallery
          </Text>
        </Link>
      ) : null}
      <Button
        label="Sign out"
        variant="outline"
        pending={signingOut}
        onPress={() => {
          setSigningOut(true);
          signOut().catch(() => setSigningOut(false));
        }}
      />
    </Screen>
  );
}
