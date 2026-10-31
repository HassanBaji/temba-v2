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

import { Button } from "./button";
import { hairline } from "./hairline-width";
import { SurfaceToneContext } from "./surface-context";
import { Text } from "./text";

const VISIBLE_MS = 3000;
// Long enough to reach for Undo after reading the message.
const ACTION_VISIBLE_MS = 6000;

export type ToastAction = { label: string; onPress: () => void };

type ToastApi = { show: (message: string, action?: ToastAction) => void };

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
  const [toast, setToast] = useState<{
    message: string;
    action?: ToastAction;
  } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, action?: ToastAction) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    setToast({ message, action });
    AccessibilityInfo.announceForAccessibility(message);
    timer.current = setTimeout(
      () => setToast(null),
      action ? ACTION_VISIBLE_MS : VISIBLE_MS,
    );
  }, []);

  const runAction = useCallback((action: ToastAction) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    setToast(null);
    action.onPress();
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
      {toast ? (
        <View
          pointerEvents={toast.action ? "box-none" : "none"}
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
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
            <Text weight="medium" style={{ flex: 1 }}>
              {toast.message}
            </Text>
            {toast.action ? (
              <Button
                label={toast.action.label}
                size="sm"
                variant="outline"
                onPress={() => {
                  if (toast.action) {
                    runAction(toast.action);
                  }
                }}
              />
            ) : null}
          </SurfaceToneContext.Provider>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}
