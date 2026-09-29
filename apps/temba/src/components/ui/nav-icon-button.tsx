import Link from "next/link";
import { ArrowLeft, X, type LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import type { MouseEventHandler } from "react";

import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const navIconButtonVariants = cva("shrink-0", {
  variants: {
    // `plain` pulls the 44px box back by its padding so the icon sits on the
    // page gutter; `boxed` is a bordered/filled action box that stays in line.
    variant: {
      plain: "-ms-3 text-current",
      boxed: "rounded-[10px]",
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

export function BackButton({ label = "Back", ...props }: NavIconButtonProps) {
  return (
    <NavIconButton
      icon={ArrowLeft}
      iconClassName="rtl:-scale-x-100"
      label={label}
      {...props}
    />
  );
}

export function CloseButton({ label = "Close", ...props }: NavIconButtonProps) {
  return <NavIconButton icon={X} label={label} {...props} />;
}
