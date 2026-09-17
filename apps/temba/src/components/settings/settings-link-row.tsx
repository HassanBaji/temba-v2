import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export function SettingsLinkRow({
  href,
  icon,
  title,
  subtitle,
  trailing,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  trailing?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="hover:bg-wash focus-visible:ring-ring/50 bg-paper not-first:border-t not-first:border-rule flex items-center gap-3.5 px-[18px] py-4 outline-none focus-visible:ring-[3px]"
    >
      <span className="text-ink shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="text-ink block truncate text-base font-semibold">
          {title}
        </span>
        <span className="text-muted-foreground text-meta mt-0.5 block truncate">
          {subtitle}
        </span>
      </span>
      {trailing}
      <ChevronRight
        aria-hidden="true"
        className="text-muted-foreground size-[18px] shrink-0"
        strokeWidth={2}
      />
    </Link>
  );
}
