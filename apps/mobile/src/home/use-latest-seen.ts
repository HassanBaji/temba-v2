import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import { LATEST_SEEN_KEY } from "./latest-model";

/** The Latest row's key once opened, remembered per device so it disappears. */
export function useLatestSeen() {
  const [seen, setSeen] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    void AsyncStorage.getItem(LATEST_SEEN_KEY)
      .catch(() => null)
      .then((stored) => {
        if (live) {
          setSeen(stored);
          setReady(true);
        }
      });
    return () => {
      live = false;
    };
  }, []);

  const markSeen = useCallback((key: string) => {
    setSeen(key);
    void AsyncStorage.setItem(LATEST_SEEN_KEY, key).catch(() => undefined);
  }, []);

  return { seen, ready, markSeen };
}
