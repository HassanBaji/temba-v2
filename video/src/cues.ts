import { players, rivals, standing } from "./data";
import {
  ACCEPT_AT,
  FORM_EVERY as RIVAL_FORM_EVERY,
  FORM_FROM as RIVAL_FORM_FROM,
  GAME_AT,
  H2H_FROM,
  PROPOSAL_AT,
  REMATCH_AT,
  RIVALS_AT,
  SECOND_AT,
  SQUAD_EVERY,
  SQUAD_FROM,
  TAB_SLIDE_AT,
} from "./scenes/challenges";
import { END } from "./scenes/end-card";
import { FULL_AT, seatAt } from "./scenes/game";
import { INTRO } from "./scenes/intro";
import { COIN_EVERY, COINS_FROM, MARKS_AT, MVP_AT, SHARE_AT as RESULT_SHARE_AT, voteAt, voteOrder } from "./scenes/result";
import { REORDER_AT as STANDING_REORDER_AT, ROW_EVERY as STANDING_ROW_EVERY, ROWS_FROM as STANDING_ROWS_FROM, SHARE_AT as STANDING_SHARE_AT, UPDATE_AT } from "./scenes/season";
import { LOCK_AT, SPLIT_AT, SWAP_AT } from "./scenes/teams";
import { LADDER_EVERY, LADDER_FROM, MOVE_AT, PROMOTE_AT, REORDER_AT, ROW_EVERY, ROWS_FROM } from "./scenes/tiers";
import { S, sceneStart } from "./stage";
import { scenes } from "./theme";

export type Cue = { frame: number; sound: string; volume: number };

/**
 * Every sound effect, placed on the frame of the animation that makes it.
 * Frames are global; the timing constants come from the scenes themselves.
 */
export function buildCues(): Cue[] {
  const cues: Cue[] = [];
  const at = (frame: number, sound: string, volume: number) => cues.push({ frame: Math.round(frame), sound, volume });
  const app = scenes.game.from;
  const start = (scene: { from: number }) => app + sceneStart(scene);

  at(INTRO.markAt, "impact", 0.55);
  at(INTRO.wordAt, "shimmer", 0.35);

  // The phone arrives; later screens crossfade with a soft air.
  at(app - 2, "whoosh", 0.5);
  for (const scene of [S.teams, S.result, S.season, S.tiers, S.challenges]) at(app + scene.from - 4, "whoosh", 0.22);

  // Game: each seat snaps solid on a rising note, then the game is full.
  const game = start(S.game);
  players.forEach((_, i) => at(game + seatAt(i), `seat-${i}`, 0.42));
  at(game + FULL_AT, "complete", 0.42);

  // Make teams: split, the Faisal and قاسم swap, lock.
  const teams = start(S.teams);
  at(teams + SPLIT_AT, "swish", 0.42);
  at(teams + SWAP_AT, "swish", 0.38);
  at(teams + LOCK_AT, "lock", 0.55);

  // Result: votes tick in, the MVP coin lands, the Marks coins pop.
  const result = start(S.result);
  voteOrder.forEach((_, k) => at(result + voteAt(k), "tick", 0.24));
  at(result + MVP_AT, "coin", 0.5);
  at(result + MARKS_AT - 2, "whoosh", 0.18);
  for (let i = 0; i < 6; i++) at(result + COINS_FROM + i * COIN_EVERY, `pop-${i}`, 0.42);
  at(result + RESULT_SHARE_AT, "tick", 0.3);

  // Standing: rows wipe in, the Game's points land, Yousif climbs to third.
  const season = start(S.season);
  standing.forEach((_, i) => at(season + STANDING_ROWS_FROM + i * STANDING_ROW_EVERY, "tick-low", 0.18));
  at(season + UPDATE_AT, "digit", 0.4);
  at(season + STANDING_REORDER_AT, "swish", 0.3);
  at(season + STANDING_SHARE_AT, "tick", 0.3);

  // Tiers: the selector climbs Safi to Shark, then Faisal swims up to Kanaad.
  const tiers = start(S.tiers);
  for (let i = 0; i < 4; i++) at(tiers + LADDER_FROM + i * LADDER_EVERY, `seat-${2 + i * 2}`, 0.32);
  for (let i = 0; i < 8; i++) at(tiers + ROWS_FROM + i * ROW_EVERY, "tick-low", 0.16);
  at(tiers + MOVE_AT, "tally", 0.35);
  at(tiers + REORDER_AT, "swish", 0.32);
  at(tiers + PROMOTE_AT, "promote", 0.45);

  // Challenges: a proposal slides in and is accepted, squads start filling;
  // then Rivals, with the head-to-head and form.
  const challenges = start(S.challenges);
  at(challenges + PROPOSAL_AT, "whoosh", 0.3);
  at(challenges + ACCEPT_AT, "confirm", 0.45);
  at(challenges + GAME_AT - 2, "whoosh", 0.18);
  for (let i = 0; i < 5; i++) at(challenges + SQUAD_FROM + i * SQUAD_EVERY, `seat-${i}`, 0.3);
  at(challenges + RIVALS_AT - 2, "whoosh", 0.18);
  at(challenges + TAB_SLIDE_AT, "swish", 0.26);
  at(challenges + H2H_FROM + 6, "tally", 0.3);
  rivals[0]!.form.forEach((variant, i) => at(challenges + RIVAL_FORM_FROM + i * RIVAL_FORM_EVERY, variant === "won" ? "tick" : "tick-low", 0.28));
  at(challenges + REMATCH_AT, "lock", 0.4);
  at(challenges + SECOND_AT, "tick-low", 0.25);

  // End card.
  const end = scenes.end.from;
  at(end + END.markAt, "impact", 0.45);
  at(end + END.wordAt, "shimmer", 0.3);
  at(end + END.downloadAt, "tick", 0.3);

  return cues.sort((a, b) => a.frame - b.frame);
}

