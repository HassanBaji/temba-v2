import { useAuth } from "@clerk/expo";
import { useState } from "react";

import { Button } from "../../../src/primitives/button";
import { Screen } from "../../../src/primitives/screen";
import { Text } from "../../../src/primitives/text";

export default function Profile() {
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <Screen>
      <Text size="h1" weight="bold">
        Profile
      </Text>
      <Text tone="muted">Coming soon.</Text>
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
