import { formatLevelRangeGateCopy } from "./level-range";

export type LevelRangeRequestInput = {
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
  viewerLevelTenths: number | null;
  canRequestLevelRange: boolean;
  levelRangeRequest: { status: string } | null;
};

export type LevelRangeRequestCard = {
  title: string;
  copy: string;
  badge: "Pending" | "Rejected" | null;
  actionLabel: string | null;
  actionEnabled: boolean;
};

export const LEVEL_RANGE_REQUEST_TITLE = "Request to play";
export const LEVEL_RANGE_REQUEST_SENT_TOAST = "Request sent";

export function levelRangeRequestCard(
  game: LevelRangeRequestInput,
): LevelRangeRequestCard | null {
  const request = game.levelRangeRequest;
  const visible =
    game.canRequestLevelRange ||
    (request != null && request.status !== "approved");
  if (!visible) {
    return null;
  }
  const pending = request?.status === "pending";
  const rejected = request?.status === "rejected";
  return {
    title: LEVEL_RANGE_REQUEST_TITLE,
    copy: formatLevelRangeGateCopy({
      levelMinTenths: game.levelMinTenths,
      levelMaxTenths: game.levelMaxTenths,
      viewerLevelTenths: game.viewerLevelTenths,
    }),
    badge: pending ? "Pending" : rejected ? "Rejected" : null,
    actionLabel: pending
      ? null
      : rejected
        ? "Request again"
        : LEVEL_RANGE_REQUEST_TITLE,
    actionEnabled: game.canRequestLevelRange,
  };
}
