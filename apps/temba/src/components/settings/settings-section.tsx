import type { ReactNode } from "react";

export function SettingsSection({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-muted-foreground font-mono text-[11px] font-normal uppercase tracking-[0.04em]">
        {eyebrow}
      </h2>
      <div className="border-rule overflow-hidden rounded-[14px] border">
        {children}
      </div>
    </section>
  );
}
