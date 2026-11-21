import { useLocalSearchParams } from "expo-router";

import { PickRoomScreen } from "../../../../src/football/pick-room-screen";

export default function PickRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PickRoomScreen gameId={id} />;
}
