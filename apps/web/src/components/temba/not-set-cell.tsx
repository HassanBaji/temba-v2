/** A hatched `dl` cell for a detail that is not set yet, such as When or Where. */
export function NotSetCell({ label }: { label: string }) {
  return (
    <div className="hatch flex flex-col gap-0.5 px-5 py-3.5 [--hatch-inset:transparent]">
      <dt className="text-eyebrow text-muted-foreground">{label}</dt>
      <dd className="text-body font-semibold">Not set</dd>
    </div>
  );
}
