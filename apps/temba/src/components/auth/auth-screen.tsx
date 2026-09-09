import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export function AuthScreen({
  variant = "default",
  backHref,
  backLabel = "Back",
  crossLink,
  title,
  description,
  footer,
  children,
  padContent = true,
}: {
  variant?: "default" | "welcome";
  backHref?: string;
  backLabel?: string;
  crossLink?: { href: string; label: string };
  title?: string;
  description?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  padContent?: boolean;
}) {
  const welcome = variant === "welcome";
  const showHeader = Boolean(backHref ?? crossLink);

  return (
    <div className="bg-wash flex min-h-svh justify-center overflow-x-hidden sm:items-center">
      <div
        className={cn(
          "flex min-h-svh w-full max-w-[390px] flex-col overflow-x-hidden sm:min-h-[844px]",
          welcome
            ? "bg-ink text-paper sm:border-ink sm:rounded-xl sm:border"
            : "bg-paper text-ink sm:border-rule sm:rounded-xl sm:border",
        )}
      >
        {showHeader ? (
          <header className="flex items-center justify-between px-[22px] pt-[22px]">
            {backHref ? (
              <Link
                href={backHref}
                aria-label={backLabel}
                className="focus-visible:ring-ring/50 -ml-2.5 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-current outline-none focus-visible:ring-[3px]"
              >
                <ArrowLeft
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={2}
                />
              </Link>
            ) : (
              <span className="size-11 shrink-0" aria-hidden="true" />
            )}
            {crossLink ? (
              <Link
                href={crossLink.href}
                className="text-body text-muted-foreground"
              >
                {crossLink.label}
              </Link>
            ) : (
              <span className="size-11 shrink-0" aria-hidden="true" />
            )}
          </header>
        ) : null}

        {(title ?? description) ? (
          <div className="px-[26px] pt-[18px]">
            {title ? (
              <h1 className="text-h1-lg font-bold leading-[1.05] tracking-[-0.02em] [font-variation-settings:'wdth'_100,'wght'_700]">
                {title}
              </h1>
            ) : null}
            {description ? (
              <p className="text-body text-muted-foreground mt-2.5 leading-[1.5]">
                {description}
              </p>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            padContent && "px-[26px] pb-8 pt-4",
          )}
        >
          {children}
        </div>

        {footer ? (
          <footer className="border-rule mt-auto border-t px-[26px] py-6">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
