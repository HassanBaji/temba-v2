import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/** iOS reports the keyboard before it moves, so a sheet can resize with it; Android only after. */
const SHOW = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
const HIDE = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

export function useKeyboardVisible() {
  const [visible, setVisible] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const shown = Keyboard.addListener(SHOW, () => setVisible(true));
    const hidden = Keyboard.addListener(HIDE, () => setVisible(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return visible;
}
