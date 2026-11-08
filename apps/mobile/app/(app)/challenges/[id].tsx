import { useLocalSearchParams } from "expo-router";

import { ChallengeDetailScreen } from "../../../src/challenges/challenge-detail-screen";

export default function Challenge() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ChallengeDetailScreen challengeId={id} />;
}
