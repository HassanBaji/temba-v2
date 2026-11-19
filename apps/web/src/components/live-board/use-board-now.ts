"use client";

import * as React from "react";

const CLOCK_TICK_MS = 1_000;

/** The board's clock, ticking each second: this device's time moved onto the server's. */
export function useBoardNow(offsetMs: number) {
  const [now, setNow] = React.useState(() => new Date(Date.now() + offsetMs));
  React.useEffect(() => {
    const tick = () => setNow(new Date(Date.now() + offsetMs));
    tick();
    const timer = window.setInterval(tick, CLOCK_TICK_MS);
    return () => window.clearInterval(timer);
  }, [offsetMs]);
  return now;
}
