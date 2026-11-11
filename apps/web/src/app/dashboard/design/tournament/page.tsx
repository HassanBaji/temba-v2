import { notFound } from "next/navigation";

import { DashboardShell } from "~/components/dashboard-shell";
import { createTournamentFixtures } from "@repo/domain/tournament-details-fixtures";
import { createTournamentCardFixtures } from "@repo/domain/tournament-card-fixtures";

import { TournamentGamesCardPreview } from "./games-card-preview";
import { TournamentPreviewStates } from "./preview-states";

export default function TournamentDesignPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const fixtures = createTournamentFixtures();
  const cardFixtures = createTournamentCardFixtures();

  return (
    <DashboardShell title="Tournament preview" width="wide">
      <TournamentGamesCardPreview />
      <TournamentPreviewStates
        fixtures={fixtures}
        cardFixtures={cardFixtures}
      />
    </DashboardShell>
  );
}
