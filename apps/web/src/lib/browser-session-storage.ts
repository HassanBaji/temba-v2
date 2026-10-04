/** Private mode or blocked site data can make even reading the property throw. */
export function browserSessionStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
