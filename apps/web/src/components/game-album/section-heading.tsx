export function SectionHeading({
  title,
  count,
}: {
  title: string;
  count: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-title font-semibold">{title}</h2>
      <span className="text-eyebrow text-muted-foreground">{count}</span>
    </div>
  );
}
