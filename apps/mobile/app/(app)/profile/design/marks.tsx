import { Redirect } from "expo-router";

import { MarksSetScreen } from "../../../../src/marks/marks-set-screen";

export default function MarksSet() {
  if (!__DEV__) {
    return <Redirect href="/profile" />;
  }
  return <MarksSetScreen />;
}
