import { useLocalSearchParams } from "expo-router";

import { ChallengeDetailScreen } from "../../../src/challenges/challenge-detail-screen";

export default function Challenge() {
  const { id, accept } = useLocalSearchParams<{
    id: string;
    accept?: string;
  }>();
  return <ChallengeDetailScreen challengeId={id} openAccept={accept === "1"} />;
}
