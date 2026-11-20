import { useEffect, useState } from "react";
import { Keyboard, Platform, type KeyboardEvent } from "react-native";

export type KeyboardFrame = {
  /** The keyboard's top edge in screen points, or null while it is hidden. */
  top: number | null;
  /** How long the keyboard takes to reach `top`, in milliseconds. */
  duration: number;
};

/**
 * iOS reports every frame change before the keyboard moves, including the
 * accessory bar arriving after the keys; Android only reports once it has
 * moved.
 */
const CHANGE =
  Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";
const HIDE = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

export function useKeyboardFrame(): KeyboardFrame {
  const [frame, setFrame] = useState<KeyboardFrame>(() => ({
    top: Keyboard.isVisible() ? (Keyboard.metrics()?.screenY ?? null) : null,
    duration: 0,
  }));
  useEffect(() => {
    const changed = Keyboard.addListener(CHANGE, (event: KeyboardEvent) =>
      setFrame({
        top: event.endCoordinates.screenY,
        duration: event.duration,
      }),
    );
    const hidden = Keyboard.addListener(HIDE, (event: KeyboardEvent) =>
      setFrame({ top: null, duration: event.duration }),
    );
    return () => {
      changed.remove();
      hidden.remove();
    };
  }, []);
  return frame;
}
