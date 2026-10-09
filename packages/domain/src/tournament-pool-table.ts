export const POOL_TABLE_HEADING = "group table";
export const POOL_WINNER_LABEL = "group winner";
export const TOURNAMENT_FINISHED_COPY = "This tournament is finished.";
export const YOUR_ROUNDS_HEADING = "Your Rounds";
export const POOL_RESULTS_HEADING = "group results";
export const UNPLAYED_RECORD_DISPLAY = "—";

export function poolRecordDisplay(value: number | null | undefined) {
  return value == null ? UNPLAYED_RECORD_DISPLAY : String(value);
}
