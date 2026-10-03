import { type TournamentMatchInput } from "~/server/games/utils";

export function matchTimes(input: TournamentMatchInput) {
  const durationInMinutes =
    input.durationInMinutes ??
    (input.startTime && input.endTime
      ? Math.max(
          0,
          Math.round(
            (input.endTime.getTime() - input.startTime.getTime()) / 60000,
          ),
        )
      : null);
  return {
    startTime: input.startTime,
    endTime: input.endTime,
    durationInMinutes,
    courtId: input.courtId,
    slot1GameTeamId: input.slot1GameTeamId,
    slot2GameTeamId: input.slot2GameTeamId,
  };
}
