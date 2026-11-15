import { useRouter } from "expo-router";

import { Notice } from "../src/groups/notice";
import { useMessages } from "../src/i18n/locale-provider";
import { Button } from "../src/primitives/button";
import { Screen } from "../src/primitives/screen";
import { ScreenHeader } from "../src/primitives/screen-header";

export default function NotFoundScreen() {
  const m = useMessages();
  const router = useRouter();
  return (
    <Screen>
      <ScreenHeader nav="back" fallback="/" />
      <Notice title={m.common.pageNotFound} />
      <Button
        label={m.common.goHome}
        size="lg"
        onPress={() => router.replace("/")}
      />
    </Screen>
  );
}
