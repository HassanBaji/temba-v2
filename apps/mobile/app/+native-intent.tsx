import { appLinkPath } from "../src/links/app-link-path";
import { holdAppLink } from "../src/links/pending-app-link";

/** Universal links arrive as web URLs; the App opens them on its own routes. */
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  const target = appLinkPath(path);
  if (!target) {
    return path;
  }
  holdAppLink(target);
  return target;
}
