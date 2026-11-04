import type { ReactNode } from "react";

function SettingsEyebrow({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-muted-foreground font-mono text-[11px] font-normal uppercase tracking-[0.04em]">
      {children}
    </h2>
  );
}

export function SettingsSection({
  eyebrow,
  children,
}: {
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      {eyebrow ? <SettingsEyebrow>{eyebrow}</SettingsEyebrow> : null}
      <div className="border-rule rounded-card overflow-hidden border">
        {children}
      </div>
    </section>
  );
}
