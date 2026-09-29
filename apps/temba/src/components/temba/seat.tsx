import { UserAvatar } from "~/components/common/user-avatar";
import { cn } from "~/lib/utils";

/**
 * Game seat parts shared by the hub card, Line-up, Players tab, invite
 * preview, join sheet and tournament Teams list.
 *
 * An open seat is always the light `hatch` with an `aria-hidden` "+"; meaning
 * lives in the caller's visible or `sr-only` copy, never in the hatch alone.
 */

const OPEN_SEAT_SIZE = {
  md: "size-10 rounded-full",
  lg: "size-[42px] rounded-full",
  /** The hub card roster chip: full column width, 46px tall. */
  chip: "h-[46px] w-full rounded-lg",
} as const;

export type OpenSeatSize = keyof typeof OPEN_SEAT_SIZE;

export function OpenSeat({
  size = "md",
  joinable = false,
  className,
}: {
  size?: OpenSeatSize;
  /** A seat the viewer can take reads in ink behind a hairline. */
  joinable?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-slot="open-seat"
      className={cn(
        "hatch flex shrink-0 items-center justify-center text-base font-semibold",
        OPEN_SEAT_SIZE[size],
        joinable
          ? "border-foreground text-foreground border"
          : "text-muted-foreground",
        className,
      )}
    >
      +
    </span>
  );
}

export function YouTag() {
  return (
    <span className="border-ink text-ink shrink-0 rounded-full border px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.04em]">
      You
    </span>
  );
}

const SEAT_AVATAR_SIZE = {
  md: "size-10",
  lg: "size-[42px]",
} as const;

/** One seat as a row: avatar or open seat, name, "You", subline, action. */
export function SeatRow({
  occupant,
  size = "lg",
  open,
  title,
  isViewer = false,
  subline,
  trailing,
}: {
  occupant: { name: string; image: string | null } | null;
  size?: keyof typeof SEAT_AVATAR_SIZE;
  /** Rendered in place of the avatar when the seat is open. */
  open?: React.ReactNode;
  /** Defaults to the occupant's name. */
  title?: React.ReactNode;
  isViewer?: boolean;
  subline?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div data-slot="seat-row" className="flex items-center gap-3">
      {occupant ? (
        <UserAvatar
          name={occupant.name}
          image={occupant.image}
          className={cn(SEAT_AVATAR_SIZE[size], "shrink-0")}
        />
      ) : (
        open
      )}
      <div className="min-w-0 flex-1">
        {(title ?? occupant) ? (
          <div className="flex items-center gap-1.5">
            <p className="text-body truncate font-medium">
              {title ?? occupant?.name}
            </p>
            {isViewer ? <YouTag /> : null}
          </div>
        ) : null}
        {subline ? (
          <p className="text-muted-foreground text-meta truncate">{subline}</p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

/**
 * One seat as a 78px tile over its Position caption: hatched while open,
 * solid ink once the viewer picks it, paper with the occupant once taken.
 */
export function SeatTile({
  occupant,
  name,
  level,
  selected,
  caption,
  label,
  onSelect,
  disabled = false,
}: {
  occupant: { name: string; image: string | null } | null;
  /** Shown under the avatar; defaults to the occupant's name ("You", …). */
  name?: string;
  level?: string | null;
  /** Set only on a pickable tile; it then announces as a toggle. */
  selected?: boolean;
  caption: string;
  /** Accessible name — the button's label, or `sr-only` text on a static tile. */
  label?: string;
  /** Renders the tile as a button. */
  onSelect?: () => void;
  disabled?: boolean;
}) {
  const taken = occupant != null;
  const picked = selected === true;
  const surface = cn(
    "flex h-[78px] w-full flex-col items-center justify-center gap-1.5 rounded-lg border px-1",
    taken
      ? "border-rule bg-paper"
      : picked
        ? "border-ink bg-ink text-paper"
        : "hatch text-muted-foreground border-transparent",
  );

  const face = taken ? (
    <>
      <UserAvatar
        name={occupant.name}
        image={occupant.image}
        size="sm"
        className="shrink-0"
      />
      <span className="text-eyebrow text-ink max-w-full truncate leading-tight">
        {name ?? occupant.name}
      </span>
      {level ? (
        <span className="text-muted-foreground max-w-full truncate text-[10px] leading-tight">
          {level}
        </span>
      ) : null}
    </>
  ) : picked ? (
    <span className="text-meta font-semibold">You</span>
  ) : (
    <span aria-hidden="true" className="text-lead leading-none">
      +
    </span>
  );

  return (
    <div data-slot="seat-tile" className="min-w-0 flex-1">
      {onSelect ? (
        <button
          type="button"
          disabled={disabled}
          aria-pressed={taken ? undefined : selected}
          aria-label={label}
          onClick={onSelect}
          className={cn(
            surface,
            "outline-none transition-colors",
            "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "disabled:cursor-default",
          )}
        >
          {face}
        </button>
      ) : (
        <div className={surface}>
          {face}
          {label ? <span className="sr-only">{label}</span> : null}
        </div>
      )}
      <p
        className={cn(
          "text-eyebrow mt-2 text-center",
          picked ? "text-ink font-medium" : "text-muted-foreground",
        )}
      >
        {caption}
      </p>
    </div>
  );
}

/** The hub's open-spots flag: a hatch swatch beside the count it names. */
export function HatchFlag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("text-ink inline-flex items-center gap-1.5", className)}
    >
      <i
        aria-hidden="true"
        className="hatch inline-block size-[13px] shrink-0 rounded-[3px]"
      />
      {children}
    </span>
  );
}
