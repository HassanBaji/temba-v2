import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

const rowClassName =
  "bg-paper not-first:border-t not-first:border-rule flex w-full items-center gap-3.5 px-[18px] py-3.5 text-start";

const interactiveClassName =
  "hover:bg-wash focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px] focus-visible:ring-inset";

function RowBody({
  icon,
  title,
  subtitle,
  trailing,
  chevron,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  chevron: boolean;
}) {
  return (
    <>
      {icon ? <span className="text-ink shrink-0">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="text-ink text-body block truncate font-semibold">
          {title}
        </span>
        {subtitle ? (
          <span className="text-muted-foreground text-meta mt-0.5 block truncate">
            {subtitle}
          </span>
        ) : null}
      </span>
      {trailing}
      {chevron ? (
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground size-[18px] shrink-0 rtl:-scale-x-100"
          strokeWidth={2}
        />
      ) : null}
    </>
  );
}

type RowProps = {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
};

export function SettingsLinkRow({
  href,
  ...props
}: RowProps & { href: string }) {
  return (
    <Link href={href} className={cn(rowClassName, interactiveClassName)}>
      <RowBody {...props} chevron />
    </Link>
  );
}

export function SettingsButtonRow({
  onClick,
  ...props
}: RowProps & { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(rowClassName, interactiveClassName)}
    >
      <RowBody {...props} chevron />
    </button>
  );
}

export function SettingsStaticRow(props: RowProps) {
  return (
    <div className={rowClassName}>
      <RowBody {...props} chevron={false} />
    </div>
  );
}
