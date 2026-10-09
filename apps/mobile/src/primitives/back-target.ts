export type BackTarget<H> = { kind: "back" } | { kind: "replace"; href: H };

export function backTarget<H>(canGoBack: boolean, fallback: H): BackTarget<H> {
  return canGoBack ? { kind: "back" } : { kind: "replace", href: fallback };
}
