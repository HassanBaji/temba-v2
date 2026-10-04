import Link from "next/link";
import { Surface } from "~/components/ui/surface";
import type { ReactNode } from "react";

import { touchHitArea } from "~/components/ui/button";
import { BackButton } from "~/components/ui/nav-icon-button";
import { TembaWordmark } from "~/components/ui/temba-wordmark";
import { cn } from "~/lib/utils";

export function AuthScreen({
  variant = "default",
  wide = false,
  brand = false,
  backHref,
  onBack,
  backLabel = "Back",
  crossLink,
  eyebrow,
  title,
  description,
  footer,
  children,
  padContent = true,
}: {
  variant?: "default" | "welcome";
  wide?: boolean;
  brand?: boolean;
  backHref?: string;
  onBack?: () => void;
  backLabel?: string;
  crossLink?: { href: string; label: string };
  eyebrow?: string;
  title?: string;
  description?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  padContent?: boolean;
}) {
  const welcome = variant === "welcome";
  const surface = welcome ? "ink" : "paper";
  const showHeader = Boolean(backHref ?? onBack ?? crossLink) || brand;
  // The frame stays wide on desktop; forms read in a phone-width column.
  const column = welcome
    ? undefined
    : cn("mx-auto w-full", wide ? "max-w-content" : "max-w-column");

  return (
    <div className="bg-ink flex min-h-svh justify-center overflow-x-hidden sm:items-center">
      <Surface
        tone={welcome ? "ink" : "paper"}
        className={cn(
          "flex min-h-svh w-full max-w-[1000px] flex-col overflow-x-hidden sm:min-h-[844px]",
          welcome
            ? "sm:border-ink sm:rounded-xl sm:border"
            : "sm:border-rule sm:rounded-xl sm:border",
        )}
      >
        {showHeader ? (
          <header
            className={cn(
              column,
              "px-5.5 pt-5.5 flex items-center justify-between",
            )}
          >
            {onBack ? (
              <BackButton
                label={backLabel}
                surface={surface}
                onClick={onBack}
              />
            ) : backHref ? (
              <BackButton label={backLabel} surface={surface} href={backHref} />
            ) : brand ? (
              <Link
                href="/"
                className="focus-visible:ring-ring/50 flex min-h-11 items-center rounded-sm outline-none focus-visible:ring-[3px]"
              >
                <TembaWordmark surface={surface} />
              </Link>
            ) : (
              <span className="size-11 shrink-0" aria-hidden="true" />
            )}
            {crossLink ? (
              <Link
                href={crossLink.href}
                className={cn(touchHitArea, "text-body text-muted-foreground")}
              >
                {crossLink.label}
              </Link>
            ) : (
              <span className="size-11 shrink-0" aria-hidden="true" />
            )}
          </header>
        ) : null}

        {(eyebrow ?? title ?? description) ? (
          <div className={cn(column, "px-6.5 pt-4.5")}>
            {eyebrow ? (
              <p className="text-meta text-muted-foreground mb-2">{eyebrow}</p>
            ) : null}
            {title ? (
              <h1
                id="auth-screen-heading"
                tabIndex={-1}
                className="text-h1-lg font-bold leading-[1.05] tracking-[-0.02em] outline-none [font-variation-settings:'wdth'_100,'wght'_700]"
              >
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
            column,
            padContent && "px-6.5 pb-8 pt-4",
          )}
        >
          {children}
        </div>

        {footer ? (
          <footer className="border-rule mt-auto border-t py-6">
            <div className={cn(column, "px-6.5")}>{footer}</div>
          </footer>
        ) : null}
      </Surface>
    </div>
  );
}
