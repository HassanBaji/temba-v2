import { useLocalSearchParams } from "expo-router";

import { ShareDraftScreen } from "../../../../src/share-draft/share-draft-screen";

export default function ShareDraft() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ShareDraftScreen gameId={id} />;
}
