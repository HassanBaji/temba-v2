import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import {
  readChecklistSkipped,
  writeChecklistSkipped,
} from "./profile-checklist-skip";

/** "Skip for now" on the Home checklist card, remembered per device. */
export function useChecklistSkipped() {
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    let live = true;
    void readChecklistSkipped(AsyncStorage).then((stored) => {
      if (live) {
        setSkipped(stored);
      }
    });
    return () => {
      live = false;
    };
  }, []);

  const setChecklistSkipped = useCallback((next: boolean) => {
    setSkipped(next);
    void writeChecklistSkipped(AsyncStorage, next);
  }, []);

  return { skipped, setChecklistSkipped };
}
