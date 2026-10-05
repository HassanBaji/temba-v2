import { useLocalSearchParams } from "expo-router";

import { CreateGameScreen } from "../../../src/create-game/create-screen";

export default function CreateGame() {
  const { groupId, type } = useLocalSearchParams<{
    groupId?: string;
    type?: string;
  }>();
  return <CreateGameScreen groupId={groupId} type={type} />;
}
