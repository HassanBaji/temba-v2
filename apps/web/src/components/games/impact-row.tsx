import { cn } from "~/lib/utils";

export type ImpactRowLine = {
  title: string;
  detail: string;
  delta: string;
  spoken: string;
};

/** One line of what a Game moved, and the total under them on wash. */
export function ImpactRow({
  row,
  total = false,
}: {
  row: ImpactRowLine;
  total?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-[13px]",
        total && "bg-wash py-3.5",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold tabular-nums">{row.title}</p>
        <p className="text-meta text-muted-foreground">{row.detail}</p>
      </div>
      <span className="sr-only">{row.spoken}</span>
      <span
        aria-hidden="true"
        className={cn(
          "font-expanded shrink-0 font-bold tabular-nums tracking-[-0.03em]",
          total ? "text-h2" : "text-lead",
        )}
      >
        <bdi dir="ltr">{row.delta}</bdi>
      </span>
    </li>
  );
}
