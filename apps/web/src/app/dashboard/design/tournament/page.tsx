import { notFound } from "next/navigation";

import { DashboardShell } from "~/components/dashboard-shell";
import { createTournamentFixtures } from "~/fixtures/tournament";
import { createTournamentCardFixtures } from "~/fixtures/tournament-card";

import { TournamentPreviewStates } from "./preview-states";

export default function TournamentDesignPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const fixtures = createTournamentFixtures();
  const cardFixtures = createTournamentCardFixtures();

  return (
    <DashboardShell title="Tournament preview" width="wide">
      <TournamentPreviewStates
        fixtures={fixtures}
        cardFixtures={cardFixtures}
      />
    </DashboardShell>
  );
}
