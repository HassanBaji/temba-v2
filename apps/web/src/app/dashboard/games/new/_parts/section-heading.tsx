export function SectionHeading({
  id,
  title,
  meta,
}: {
  id: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="font-expanded text-title">
        {title}
      </h2>
      {meta ? <p className="text-muted-foreground text-meta">{meta}</p> : null}
    </div>
  );
}
