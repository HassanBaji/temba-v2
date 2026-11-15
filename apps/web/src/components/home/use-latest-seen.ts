"use client";

import { useCallback, useEffect, useState } from "react";

const LATEST_SEEN_KEY = "temba.home.latestSeen";

/** The Latest row's key once opened, remembered in this browser so it disappears. */
export function useLatestSeen() {
  const [seen, setSeen] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setSeen(window.localStorage.getItem(LATEST_SEEN_KEY));
    } catch {
      setSeen(null);
    }
    setReady(true);
  }, []);

  const markSeen = useCallback((key: string) => {
    setSeen(key);
    try {
      window.localStorage.setItem(LATEST_SEEN_KEY, key);
    } catch {
      // Remembering is a convenience; the row still opens without storage.
    }
  }, []);

  return { seen, ready, markSeen };
}
