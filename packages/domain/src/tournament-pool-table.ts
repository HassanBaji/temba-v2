export const UNPLAYED_RECORD_DISPLAY = "—";

export function poolRecordDisplay(value: number | null | undefined) {
  return value == null ? UNPLAYED_RECORD_DISPLAY : String(value);
}
