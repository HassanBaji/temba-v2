"use client";

import { Loader2Icon, type LucideIcon } from "lucide-react";

/** A compact secondary door: an icon over a word, three to a row. */
export function ActionTile({
  label,
  icon: Icon,
  pending = false,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  pending?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className="border-rule bg-paper text-eyebrow hover:bg-wash focus-visible:ring-ring/50 flex h-[66px] min-w-0 flex-col items-center justify-center gap-[7px] rounded-lg border font-semibold outline-none transition-colors focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? (
        <Loader2Icon className="size-[18px] animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="size-[18px]" aria-hidden="true" />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}

export function ActionTileRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-2">{children}</div>;
}
