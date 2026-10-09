import { colors, radii, spacing } from "@repo/design-tokens";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AccessibilityInfo, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { hairline } from "./hairline-width";
import { SurfaceToneContext } from "./surface-context";
import { Text } from "./text";

const VISIBLE_MS = 3000;

type ToastApi = { show: (message: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error("useToast needs a ToastProvider above it.");
  }
  return api;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    setMessage(next);
    AccessibilityInfo.announceForAccessibility(next);
    timer.current = setTimeout(() => setMessage(null), VISIBLE_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {message ? (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{
            position: "absolute",
            left: spacing.compact,
            right: spacing.compact,
            bottom: insets.bottom + spacing.compact,
            padding: spacing.compact - 4,
            borderRadius: radii.md,
            borderWidth: hairline,
            borderColor: colors.rule,
            backgroundColor: colors.paper,
          }}
        >
          <SurfaceToneContext.Provider value="paper">
            <Text weight="medium">{message}</Text>
          </SurfaceToneContext.Provider>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}
