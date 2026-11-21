import { Redirect } from "expo-router";

import { SeriesBadgeSetScreen } from "../../../../src/series/series-badge-set-screen";

export default function SeriesBadgeSet() {
  if (!__DEV__) {
    return <Redirect href="/profile" />;
  }
  return <SeriesBadgeSetScreen />;
}
