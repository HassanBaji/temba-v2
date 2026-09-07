import { notFound } from "next/navigation";

import { EmptyState } from "~/components/common/empty-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { HomeAllTime } from "~/components/home/home-all-time";
import { HomeComingUp } from "~/components/home/home-coming-up";
import { HomeHeader } from "~/components/home/home-header";
import { HomeLevelBlock } from "~/components/home/home-level-block";
import { HomeNoGames, HomeNextGame } from "~/components/home/home-next-game";
import { deriveRecentForm } from "~/components/home/home-recent-form";
import { HomeRecentFormBlock } from "~/components/home/home-recent-form-row";
import { HomeStanding } from "~/components/home/home-standing";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { createHomeFixtures, type HomeFixture } from "~/fixtures/home";

function HatchSwatches() {
  return (
    <section className="space-y-3">
      <h2 className="text-title font-semibold">Hatch</h2>
      <div className="flex flex-wrap gap-6">
        <div className="space-y-2">
          <div
            aria-hidden="true"
            className="hatch border-rule size-16 rounded-[5px] border"
          />
          <p className="text-muted-foreground text-meta">
            Light hatch — not yet
          </p>
        </div>
        <div className="bg-ink space-y-2 rounded-xl p-3">
          <div
            aria-hidden="true"
            className="hatch hatch-on-ink size-16 rounded-[5px]"
          />
          <p className="text-dim text-meta">Black-surface hatch — not yet</p>
        </div>
      </div>
    </section>
  );
}

function HomeColumn({
  title,
  fixture,
}: {
  title: string;
  fixture: HomeFixture;
}) {
  const nextGame = fixture.nextGame;

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col gap-[26px]">
      <h2 className="text-title font-semibold">{title}</h2>
      <HomeHeader
        name={fixture.userName}
        pendingInviteCount={fixture.pendingInviteCount}
        bookedGameCount={fixture.bookedGameCount}
        ready
      />
      {nextGame ? (
        <HomeNextGame
          id={nextGame.id}
          phase={nextGame.phase}
          venueName={nextGame.venueName}
          courtLabel={nextGame.courtLabel}
          formatLabel={nextGame.formatLabel}
          startsAt={new Date(nextGame.startsAt)}
          seats={nextGame.seats}
        />
      ) : (
        <HomeNoGames />
      )}
      <HomeComingUp
        games={fixture.comingUp.map((game) => ({
          id: game.id,
          venueName: game.venueName,
          startsAt: new Date(game.startsAt),
          seatsTaken: game.seatsTaken,
          seatsTotal: game.seatsTotal,
        }))}
      />
      {fixture.level.band && fixture.level.level ? (
        <HomeLevelBlock
          band={fixture.level.band}
          level={fixture.level.level}
          provisional={fixture.level.provisional}
          ratedMatchesRemaining={fixture.level.ratedMatchesRemaining}
          history={fixture.level.history}
          progressPercent={fixture.level.progressPercent}
          nextBand={fixture.level.nextBand}
        />
      ) : (
        <div className="border-rule bg-paper rounded-xl border p-[22px]">
          <p className="text-lead font-semibold">Declare your Level</p>
          <p className="text-muted-foreground text-meta mt-1">
            No Rating yet — the declare prompt hosts the existing dialog.
          </p>
        </div>
      )}
      <HomeRecentFormBlock
        form={deriveRecentForm(
          fixture.recentForm.map((outcome) => ({
            outcome,
            scoredSets: [{ slot1GamesWon: 6, slot2GamesWon: 4 }],
          })),
        )}
      />
      <HomeAllTime
        gamesPlayed={fixture.gamesPlayed}
        gamesWon={fixture.gamesWon}
        gamesLost={fixture.gamesLost}
      />
      <HomeStanding rows={fixture.standing} />
    </div>
  );
}

function EmptyScaffolds({ fixture }: { fixture: HomeFixture }) {
  return (
    <section className="space-y-4">
      <h2 className="text-title font-semibold">Empty states</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-muted-foreground text-meta">No games</p>
          <EmptyState
            title="No games booked"
            description="Browse public pickup or create a Game."
            action={<Button type="button">Create Game</Button>}
            className="py-6"
          />
        </Card>
        <Card>
          <p className="text-muted-foreground text-meta">No Rating</p>
          <EmptyState
            title="Declare your Level"
            description={
              fixture.level.canSelfDeclare
                ? "No Rating yet — the declare prompt hosts the existing dialog."
                : "Cannot self-declare"
            }
            action={<Button type="button">Declare Level</Button>}
            className="py-6"
          />
        </Card>
        <Card>
          <p className="text-muted-foreground text-meta">No games played</p>
          <div className="flex gap-1 py-6">
            {Array.from({ length: 10 }, (_, index) => (
              <div
                key={index}
                aria-hidden="true"
                className="hatch h-[38px] min-w-0 flex-1 rounded-[5px]"
              />
            ))}
          </div>
          <HomeAllTime
            gamesPlayed={fixture.gamesPlayed}
            gamesWon={fixture.gamesWon}
            gamesLost={fixture.gamesLost}
          />
        </Card>
      </div>
    </section>
  );
}

export default function HomeDesignPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const { provisional, confirmed, empty } = createHomeFixtures();

  return (
    <DashboardShell title="Home preview" width="wide">
      <div className="space-y-10">
        <HatchSwatches />
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <HomeColumn title="Provisional" fixture={provisional} />
          <HomeColumn title="Confirmed" fixture={confirmed} />
        </div>
        <EmptyScaffolds fixture={empty} />
      </div>
    </DashboardShell>
  );
}
