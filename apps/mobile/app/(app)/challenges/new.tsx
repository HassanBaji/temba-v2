import { useLocalSearchParams } from "expo-router";

import { PostChallengeScreen } from "../../../src/challenges/post-challenge-screen";

export default function NewChallenge() {
  const { team, rematch } = useLocalSearchParams<{
    team?: string;
    rematch?: string;
  }>();
  return (
    <PostChallengeScreen
      rematch={
        team && rematch ? { teamId: team, opponentTeamId: rematch } : null
      }
    />
  );
}
