"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, X, type LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import type { MouseEvent, MouseEventHandler } from "react";

import { buttonVariants } from "~/components/ui/button";
import { currentBackSteps, isDashboardPath } from "~/lib/navigation-trail";
import { cn } from "~/lib/utils";

const navIconButtonVariants = cva("shrink-0", {
  variants: {
    // `plain` pulls the 44px box back by its padding so the icon sits on the
    // page gutter; `boxed` is a bordered/filled action box that stays in line.
    variant: {
      plain: "-ms-3 text-current",
      boxed: "rounded-md",
    },
    surface: {
      paper: "",
      ink: "surface-ink",
    },
  },
  compoundVariants: [
    {
      variant: "boxed",
      surface: "paper",
      className: "border-rule text-ink border",
    },
    { variant: "boxed", surface: "ink", className: "bg-raised text-paper" },
  ],
  defaultVariants: {
    variant: "plain",
    surface: "paper",
  },
});

type NavIconButtonStyle = VariantProps<typeof navIconButtonVariants> & {
  label?: string;
  className?: string;
};

type NavIconButtonTarget =
  | { href: string; onClick?: MouseEventHandler<HTMLAnchorElement> }
  | { href?: undefined; onClick: () => void; disabled?: boolean };

type NavIconButtonProps = NavIconButtonStyle & NavIconButtonTarget;

function NavIconButton({
  icon: Icon,
  iconClassName,
  label,
  variant,
  surface,
  className,
  ...target
}: NavIconButtonProps & {
  icon: LucideIcon;
  iconClassName?: string;
  label: string;
}) {
  const classes = cn(
    buttonVariants({ variant: null, size: "icon" }),
    navIconButtonVariants({ variant, surface }),
    className,
  );
  const icon = (
    <Icon
      aria-hidden="true"
      className={cn("size-5", iconClassName)}
      strokeWidth={2}
    />
  );

  if (target.href !== undefined) {
    return (
      <Link
        href={target.href}
        onClick={target.onClick}
        aria-label={label}
        className={classes}
      >
        {icon}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={target.onClick}
      disabled={target.disabled}
      aria-label={label}
      className={classes}
    >
      {icon}
    </button>
  );
}

function opensElsewhere(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

/**
 * On Dashboard pages `href` is only the fallback: the button returns to the
 * page the player came from, and replaces the entry with `href` when there is
 * no such page (opened from a shared link or a new tab).
 */
export function BackButton({ label = "Back", ...props }: NavIconButtonProps) {
  const router = useRouter();
  const style = {
    icon: ArrowLeft,
    iconClassName: "rtl:-scale-x-100",
    label,
  };

  if (props.href === undefined) {
    return <NavIconButton {...style} {...props} />;
  }

  const { href, onClick, ...rest } = props;
  return (
    <NavIconButton
      {...style}
      {...rest}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          opensElsewhere(event) ||
          !isDashboardPath(window.location.pathname)
        ) {
          return;
        }
        event.preventDefault();
        const steps = currentBackSteps();
        if (steps) {
          window.history.go(-steps);
        } else {
          router.replace(href);
        }
      }}
    />
  );
}

export function CloseButton({ label = "Close", ...props }: NavIconButtonProps) {
  return <NavIconButton icon={X} label={label} {...props} />;
}
