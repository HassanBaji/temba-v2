import { Redirect } from "expo-router";

import { TEAMS_PATH } from "../../../../src/teams/teams-model";

export default function Teams() {
  return <Redirect href={TEAMS_PATH} />;
}
