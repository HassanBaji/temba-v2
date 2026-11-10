import { group, players, profile, standing } from "./data";
import { END } from "./scenes/end-card";
import { FULL_AT, seatAt } from "./scenes/game";
import { FRAMES_PER_CHAR, MEMBER_EVERY, MEMBERS_FROM, TYPE_FROM } from "./scenes/group";
import { INTRO } from "./scenes/intro";
import { A_EVERY, B_EVERY, CHART_FROM, CONFIRM_AT, FORM_EVERY, FORM_FROM, SCORE, SCORE_FROM } from "./scenes/result";
import { FLIP_AT, ROW_EVERY, ROWS_FROM } from "./scenes/season";
import { LOCK_AT, SHUFFLE_AT, SPLIT_AT } from "./scenes/teams";
import { PROFILE_AT, S } from "./stage";
import { scenes } from "./theme";

export type Cue = { frame: number; sound: string; volume: number };

/**
 * Every sound effect, placed on the frame of the animation that makes it.
 * Frames are global; the timing constants come from the scenes themselves.
 */
export function buildCues(): Cue[] {
  const cues: Cue[] = [];
  const at = (frame: number, sound: string, volume: number) => cues.push({ frame: Math.round(frame), sound, volume });
  const app = scenes.group.from;

  at(INTRO.markAt, "impact", 0.55);
  at(INTRO.wordAt, "shimmer", 0.35);

  // The phone arrives, then each screen pushes in.
  at(app - 2, "whoosh", 0.5);
  for (const frame of [S.game.from, S.teams.from, S.result.from, PROFILE_AT, S.season.from]) at(app + frame, "whoosh", 0.38);

  // Group: the name types in, members pop into the list.
  for (let i = 1; i <= group.name.length; i++) {
    if (group.name[i - 1] === " ") continue;
    at(app + TYPE_FROM + Math.ceil(i * FRAMES_PER_CHAR), `type-${i % 3}`, 0.32);
  }
  for (let i = 0; i < 6; i++) at(app + MEMBERS_FROM + i * MEMBER_EVERY + 2, `pop-${i}`, 0.42);

  // Game: each seat snaps solid on a rising note, then the game is full.
  const game = app + S.game.from;
  players.forEach((_, i) => at(game + seatAt(i), `seat-${i}`, 0.42));
  at(game + FULL_AT, "complete", 0.42);

  // Teams: split, shuffle, lock.
  const teams = app + S.teams.from;
  at(teams + SPLIT_AT, "swish", 0.42);
  at(teams + SHUFFLE_AT, "swish", 0.38);
  at(teams + LOCK_AT, "lock", 0.55);

  // Result: the digits tick up, the score is confirmed.
  const result = app + S.result.from;
  for (let k = 1; k <= SCORE.a; k++) at(result + SCORE_FROM + k * A_EVERY, "digit", 0.4);
  for (let k = 1; k <= SCORE.b; k++) at(result + SCORE_FROM + k * B_EVERY + 1, "digit", 0.3);
  at(result + CONFIRM_AT, "confirm", 0.45);

  // Profile: form slots fill (a brighter tick for a win), the chart draws.
  const profileAt = app + PROFILE_AT;
  profile.form.forEach((variant, i) => at(profileAt + FORM_FROM + i * FORM_EVERY, variant === "won" ? "tick" : "tick-low", 0.3));
  at(profileAt + CHART_FROM, "draw", 0.22);

  // Season: rows cascade in, then #1 flips to ink.
  const season = app + S.season.from;
  standing.forEach((_, i) => at(season + ROWS_FROM + i * ROW_EVERY, "tick-low", 0.22));
  at(season + FLIP_AT, "flip", 0.5);

  // End card.
  const end = scenes.end.from;
  at(end + END.markAt, "impact", 0.45);
  at(end + END.wordAt, "shimmer", 0.3);
  at(end + END.urlAt, "tick", 0.3);

  return cues.sort((a, b) => a.frame - b.frame);
}
