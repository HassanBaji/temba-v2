export function SectionTitle({
  title,
  meta,
  status,
}: {
  title: string;
  meta?: string | null;
  status?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-title min-w-0 truncate font-semibold">{title}</h2>
      {status ??
        (meta ? (
          <p className="text-meta text-muted-foreground shrink-0">{meta}</p>
        ) : null)}
    </div>
  );
}
