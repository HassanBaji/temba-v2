import Constants from "expo-constants";

import { env } from "../env";
import { resolveApiOrigin } from "./api-origin";

export const apiOrigin = resolveApiOrigin({
  override: env.apiOrigin,
  devServerHostUri: Constants.expoConfig?.hostUri,
});
