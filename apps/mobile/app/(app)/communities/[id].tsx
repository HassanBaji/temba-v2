import { useLocalSearchParams } from "expo-router";

import { CommunityHomeScreen } from "../../../src/communities/community-home-screen";

export default function CommunityHome() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CommunityHomeScreen communityId={id} />;
}
