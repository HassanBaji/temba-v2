export function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-rule text-body flex items-center justify-between gap-3 border-t px-[18px] py-3.5 first:border-t-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">{value}</span>
    </div>
  );
}
