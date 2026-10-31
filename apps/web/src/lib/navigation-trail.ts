/**
 * Every history entry the App pushes carries the paths of the entries before
 * it, so a back button can return to the page the player came from with
 * `history.go(-steps)` instead of linking to a fixed parent page.
 */
const TRAIL_KEY = "__tembaTrail";
const MAX_TRAIL = 50;

/** Pages a back button steps over: create flows and editors that hand off to another page when done. */
const PASS_THROUGH = [
  /^\/dashboard\/games\/new(-tournament)?$/,
  /^\/dashboard\/(groups|communities|teams|venues)\/new$/,
  /^\/dashboard\/games\/[^/]+\/(score|teams|partner)$/,
  /^\/dashboard\/groups\/[^/]+\/members\/[^/]+$/,
];

function normalizePath(path: string) {
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

export function isDashboardPath(path: string) {
  return path === "/dashboard" || path.startsWith("/dashboard/");
}

export function trailFromHistoryState(state: unknown): string[] {
  if (typeof state !== "object" || state === null) {
    return [];
  }
  const trail = (state as Record<string, unknown>)[TRAIL_KEY];
  return Array.isArray(trail)
    ? trail.filter((path): path is string => typeof path === "string")
    : [];
}

/**
 * How many entries to go back to reach the page the player came from, or
 * `null` when the trail holds no such Dashboard page and the caller should
 * fall back to the page's parent.
 */
export function backSteps(
  trail: readonly string[],
  currentPath: string,
): number | null {
  const current = normalizePath(currentPath);
  if (!isDashboardPath(current)) {
    return null;
  }
  for (let index = trail.length - 1; index >= 0; index--) {
    const path = normalizePath(trail[index] ?? "");
    if (path === current || PASS_THROUGH.some((page) => page.test(path))) {
      continue;
    }
    return isDashboardPath(path) ? trail.length - index : null;
  }
  return null;
}

function isPlainState(data: unknown): data is Record<string, unknown> | null {
  return (
    data === null ||
    data === undefined ||
    Object.getPrototypeOf(data) === Object.prototype
  );
}

function withTrail(data: unknown, trail: string[]) {
  return isPlainState(data) ? { ...data, [TRAIL_KEY]: trail } : data;
}

const INSTALLED = Symbol.for("temba.navigationTrail");

/** Idempotent; wraps the history methods Next.js calls on every navigation. */
export function installNavigationTrail() {
  const history = window.history as History & { [INSTALLED]?: true };
  if (history[INSTALLED]) {
    return;
  }
  history[INSTALLED] = true;

  const pushState = history.pushState.bind(history);
  const replaceState = history.replaceState.bind(history);

  history.pushState = (data, unused, url) => {
    const trail = [
      ...trailFromHistoryState(history.state),
      window.location.pathname,
    ].slice(-MAX_TRAIL);
    pushState(withTrail(data, trail), unused, url);
  };
  history.replaceState = (data, unused, url) => {
    replaceState(
      withTrail(data, trailFromHistoryState(history.state)),
      unused,
      url,
    );
  };
}

export function currentBackSteps() {
  return backSteps(
    trailFromHistoryState(window.history.state),
    window.location.pathname,
  );
}
