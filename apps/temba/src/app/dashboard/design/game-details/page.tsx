import { notFound } from "next/navigation";

import { DashboardShell } from "~/components/dashboard-shell";
import {
  createGameDetailsFixtures,
  type GameDetailsFixture,
} from "~/fixtures/game-details";

/**
 * Minimal, structured per-state dump — not the redesigned production page.
 * The tab bar, hero, line-up, and score section this fixture will eventually
 * back are built incrementally in TEM-179 through TEM-184; this route only
 * needs to make the fixture's phase/hatch/confirmation states inspectable
 * now (`.scratch/game-details-redesign/spec.md`, "Preview route").
 */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-meta">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SeatRow({
  label,
  seat,
  isViewer,
}: {
  label: string;
  seat: { name: string; levelBand: string | null } | null;
  isViewer: boolean;
}) {
  if (!seat) {
    return (
      <div className="hatch flex items-center justify-between rounded-[5px] px-3 py-2 text-meta">
        <span aria-hidden="true">+ Open</span>
        <span className="sr-only">{label}: open seat</span>
      </div>
    );
  }
  return (
    <div className="border-rule flex items-center justify-between rounded-[5px] border px-3 py-2 text-meta">
      <span>
        {seat.name}
        {isViewer ? " (You)" : ""}
      </span>
      <span className="text-muted-foreground">{seat.levelBand ?? "—"}</span>
    </div>
  );
}

function GameDetailsStateColumn({
  title,
  fixture,
}: {
  title: string;
  fixture: GameDetailsFixture;
}) {
  const match = fixture.matches[0];
  const confirmation = fixture.matchResultConfirmation;
  const ratingImpact = fixture.ratingImpact;

  return (
    <div className="border-rule bg-paper flex flex-col gap-4 rounded-xl border p-4">
      <div>
        <h3 className="text-lead font-semibold">{title}</h3>
        <p className="text-muted-foreground text-meta">
          phase: <span className="font-mono">{fixture.phase}</span>
        </p>
      </div>

      <section className="space-y-1">
        <Field label="Venue" value={fixture.venue?.name ?? "—"} />
        <Field label="Court" value={match?.courtName ?? "—"} />
        <Field
          label="Window"
          value={
            fixture.windowStart && fixture.windowEnd
              ? `${new Date(fixture.windowStart).toLocaleString()} – ${new Date(
                  fixture.windowEnd,
                ).toLocaleTimeString()}`
              : "—"
          }
        />
        <Field
          label="Price / player"
          value={
            fixture.pricePerPlayerCents != null
              ? `£${(fixture.pricePerPlayerCents / 100).toFixed(2)}`
              : "—"
          }
        />
      </section>

      <section className="space-y-2">
        <h4 className="text-meta font-semibold">Line-up</h4>
        <div className="grid grid-cols-2 gap-2">
          {fixture.sides.map((side) => (
            <div key={side.sideIndex} className="space-y-1">
              <p className="text-muted-foreground text-meta">
                Side {side.sideIndex}
              </p>
              <SeatRow
                label={`Side ${side.sideIndex} left`}
                seat={side.left}
                isViewer={side.left?.userId === fixture.viewerUserId}
              />
              <SeatRow
                label={`Side ${side.sideIndex} right`}
                seat={side.right}
                isViewer={side.right?.userId === fixture.viewerUserId}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-meta font-semibold">Score</h4>
        {match && match.sets.length > 0 ? (
          <div className="flex gap-2">
            {match.sets.map((set) => (
              <div
                key={set.id}
                className="border-rule tabular-nums rounded-[5px] border px-2 py-1 text-meta"
              >
                {set.slot1GamesWon}–{set.slot2GamesWon}
              </div>
            ))}
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="hatch flex h-10 items-center justify-center rounded-[5px] text-meta"
          >
            No score yet
          </div>
        )}
        <Field label="Match status" value={match?.status ?? "—"} />
        <Field label="Outcome" value={match?.outcome.result ?? "—"} />
      </section>

      <section className="space-y-1">
        <h4 className="text-meta font-semibold">Match result confirmation</h4>
        {confirmation ? (
          <>
            <Field
              label="Confirmed"
              value={`${confirmation.confirmedUserIds.length} / ${confirmation.requiredUserIds.length}`}
            />
            <Field
              label="Viewer confirmed"
              value={confirmation.viewerHasConfirmed ? "Yes" : "No"}
            />
          </>
        ) : (
          <p className="text-muted-foreground text-meta">Not applicable</p>
        )}
      </section>

      {ratingImpact ? (
        <section className="space-y-1">
          <h4 className="text-meta font-semibold">Rating impact</h4>
          <Field
            label="Level change"
            value={
              ratingImpact.levelChange >= 0
                ? `+${ratingImpact.levelChange}`
                : ratingImpact.levelChange
            }
          />
          <Field
            label="New level"
            value={`${ratingImpact.newLevel} (${ratingImpact.newLevelBand})`}
          />
          <Field
            label="Provisional"
            value={ratingImpact.isProvisional ? "Yes" : "No"}
          />
        </section>
      ) : null}

      <details className="text-muted-foreground text-meta">
        <summary className="cursor-pointer select-none">Raw fixture</summary>
        <pre className="bg-wash mt-2 overflow-x-auto rounded-[5px] p-2 text-xs">
          {JSON.stringify(fixture, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default function GameDetailsDesignPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const { upcoming, needsScore, needsScorePartiallyConfirmed, final } =
    createGameDetailsFixtures();

  return (
    <DashboardShell title="Game details preview" width="wide">
      <div className="space-y-10">
        <section className="grid items-start gap-4 lg:grid-cols-3">
          <GameDetailsStateColumn title="Upcoming" fixture={upcoming} />
          <GameDetailsStateColumn title="Needs a score" fixture={needsScore} />
          <GameDetailsStateColumn title="Final" fixture={final} />
        </section>
        <section className="space-y-3">
          <h2 className="text-title font-semibold">
            Additional confirmation coverage
          </h2>
          <p className="text-muted-foreground text-meta max-w-prose">
            Needs a score, partially confirmed — one Set entered (the
            entering User auto-confirmed per ADR-0011), three confirmations
            still outstanding.
          </p>
          <div className="grid gap-4 lg:grid-cols-3">
            <GameDetailsStateColumn
              title="Needs a score — partially confirmed"
              fixture={needsScorePartiallyConfirmed}
            />
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
