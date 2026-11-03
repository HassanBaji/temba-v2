import { useLocalSearchParams } from "expo-router";

import { ShareResultScreen } from "../../../../src/share-result/share-result-screen";

export default function ShareResult() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ShareResultScreen gameId={id} />;
}
