const TOKEN_PREFIX = "temba.tv.token.";
const NAME_KEY = "temba.tv.name";

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The token this browser was given for a board, so a reload stays the same TV. */
export function readTvToken(code: string) {
  return storage()?.getItem(TOKEN_PREFIX + code) ?? null;
}

export function writeTvToken(code: string, token: string) {
  storage()?.setItem(TOKEN_PREFIX + code, token);
}

export function clearTvToken(code: string) {
  storage()?.removeItem(TOKEN_PREFIX + code);
}

export function readTvName() {
  return storage()?.getItem(NAME_KEY) ?? "";
}

export function writeTvName(name: string) {
  const store = storage();
  if (name) {
    store?.setItem(NAME_KEY, name);
  } else {
    store?.removeItem(NAME_KEY);
  }
}
