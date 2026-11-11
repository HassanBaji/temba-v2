import { onlineManager } from "@tanstack/react-query";
import { useCallback } from "react";

import { useMessages } from "../i18n/locale-provider";
import { errorMessage } from "./error-message";

export function useErrorMessage() {
  const { common } = useMessages();
  return useCallback(
    (error: unknown) => errorMessage(error, common, onlineManager.isOnline()),
    [common],
  );
}
