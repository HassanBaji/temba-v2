import { StatStrip } from "~/components/common/stat-strip";
import type { GroupHomeRecord } from "~/lib/group-home-chrome";

export function GroupHomeRecordStrip({ record }: { record: GroupHomeRecord }) {
  if (record.kind === "none") {
    return null;
  }

  if (record.kind === "empty") {
    return (
      <p className="text-body text-muted-foreground">
        Your record appears here after your first game.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-eyebrow text-muted-foreground font-medium uppercase tracking-[0.06em]">
        Your record in this group
      </p>
      <StatStrip
        tone="dark"
        items={[
          { label: "Games", value: record.games },
          { label: "Sets", value: record.sets },
          { label: "Points", value: record.points },
        ]}
      />
    </div>
  );
}
