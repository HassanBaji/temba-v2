import * as React from "react";

/** Below this, a shrunken visual viewport is browser chrome, not a keyboard. */
const KEYBOARD_MIN_HEIGHT = 120;

/** True while a phone's on-screen keyboard covers part of the page. Never true on a desktop. */
export function useSoftKeyboardOpen() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }
    const onResize = () =>
      setOpen(window.innerHeight - viewport.height > KEYBOARD_MIN_HEIGHT);
    viewport.addEventListener("resize", onResize);
    onResize();
    return () => viewport.removeEventListener("resize", onResize);
  }, []);
  return open;
}
