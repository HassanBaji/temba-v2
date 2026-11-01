import { useLocalSearchParams } from "expo-router";

import { GroupEditScreen } from "../../../src/groups/group-edit-screen";

export default function EditGroup() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <GroupEditScreen groupId={groupId} />;
}
