import { useLocalSearchParams } from "expo-router";

import { GroupCreateScreen } from "../../../src/groups/group-create-screen";

export default function NewGroup() {
  const { communityId } = useLocalSearchParams<{ communityId?: string }>();
  return <GroupCreateScreen communityId={communityId} />;
}
