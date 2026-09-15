import Link from "next/link";

import { ResultMark } from "~/components/temba/result-mark";
import {
  groupPlayedMarkVariant,
  groupPlayedOpponentLine,
  groupPlayedScoreLine,
  groupPlayedTeamLabel,
} from "~/lib/group-home-chrome";
import { type RouterOutputs } from "~/trpc/react";

type GroupPlayedGame = RouterOutputs["groups"]["byId"]["gameHistory"][number];

/**
 * One past Game on the Group Games tab (design 06b): the result mark, the
 * viewer's side over the other side and the date, and the scoreline. A Match
 * with no score draws **Enter** instead, and the row reaches the Game either
 * way. A Game the viewer did not play in has no viewer slot — no "You", and
 * no borrowed result.
 *
 * Compact by design: `MatchHistoryCard` stays the Games hub card.
 */
export function GroupPlayedRow({ game }: { game: GroupPlayedGame }) {
  const viewerMembers =
    game.viewerSlot === 2 ? game.slot2Members : game.slot1Members;
  const otherMembers =
    game.viewerSlot === 2 ? game.slot1Members : game.slot2Members;
  const scoreLine = groupPlayedScoreLine(game.scoredSets, game.viewerSlot);

  return (
    <li className="border-rule border-t first:border-t-0">
      <Link
        href={`/dashboard/games/${game.id}`}
        className="focus-visible:ring-ring/50 flex items-center gap-3 px-5 py-[18px] outline-none focus-visible:ring-[3px]"
      >
        <ResultMark
          variant={groupPlayedMarkVariant(game.outcome)}
          className="size-[18px]"
        />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px]">
            {groupPlayedTeamLabel(viewerMembers)}
          </span>
          <span className="text-meta text-muted-foreground block truncate">
            {groupPlayedOpponentLine(otherMembers, game.displayTime)}
          </span>
        </span>

        {game.cancelled ? (
          <span className="text-meta text-muted-foreground shrink-0">
            Cancelled
          </span>
        ) : scoreLine ? (
          <span className="font-expanded shrink-0 text-[16px] tabular-nums tracking-[-0.03em]">
            {scoreLine}
          </span>
        ) : (
          <span className="text-meta shrink-0 font-semibold">Enter</span>
        )}
      </Link>
    </li>
  );
}
