import { Fragment } from "react";

import { cn } from "~/lib/utils";

const PAIR_SEPARATOR = " / ";

/**
 * A team label such as "Testa Phonedoor / أحمد الخليفة". Each name truncates
 * on its own and in its own direction, so a Latin name in Arabic loses its
 * end, not its start, and the partner stays visible.
 */
export function PairLabel({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const names = label.split(PAIR_SEPARATOR);
  return (
    <span className={cn("flex min-w-0", className)}>
      {names.map((name, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <span className="shrink-0 whitespace-pre">{PAIR_SEPARATOR}</span>
          ) : null}
          <span dir="auto" className="min-w-0 truncate">
            {name}
          </span>
        </Fragment>
      ))}
    </span>
  );
}
