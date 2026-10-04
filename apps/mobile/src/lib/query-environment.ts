import { focusManager, onlineManager } from "@tanstack/react-query";
import { addNetworkStateListener, getNetworkStateAsync } from "expo-network";
import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";

export function useQueryEnvironment() {
  useEffect(() => {
    const onAppState = (status: AppStateStatus) =>
      focusManager.setFocused(status === "active");
    const appState = AppState.addEventListener("change", onAppState);

    const setOnline = (state: { isInternetReachable?: boolean }) =>
      onlineManager.setOnline(state.isInternetReachable !== false);
    void getNetworkStateAsync().then(setOnline);
    const network = addNetworkStateListener(setOnline);

    return () => {
      appState.remove();
      network.remove();
    };
  }, []);
}
