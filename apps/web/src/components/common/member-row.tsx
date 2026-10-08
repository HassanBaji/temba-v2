import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ListRow } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { YouTag } from "~/components/temba/seat";

export function MemberRow({
  name,
  image,
  isViewer = false,
  meta,
  badge,
  trailing,
  size,
  href,
  onSelect,
}: {
  name: string;
  image?: string | null;
  isViewer?: boolean;
  meta?: ReactNode;
  badge?: ReactNode;
  trailing?: ReactNode;
  size?: "default" | "lg";
  href?: string;
  /** Makes the whole row a button, with a chevron on narrow screens too. */
  onSelect?: () => void;
}) {
  const hasTrailing = badge != null || trailing != null;

  const rowProps = {
    size,
    leading: <UserAvatar name={name} image={image} size="lg" />,
    title: (
      // Wraps instead of truncating: trailing form and level columns leave
      // a narrow name column at 360px, and the You tag must stay visible.
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 whitespace-normal">
        <span className="min-w-0 break-words">{name}</span>
        {isViewer ? <YouTag /> : null}
      </span>
    ),
    meta,
    trailing:
      hasTrailing || onSelect ? (
        <div className="flex items-center gap-2">
          {badge}
          {trailing}
          {onSelect ? (
            <ChevronRight
              aria-hidden="true"
              className="text-muted-foreground size-[18px] shrink-0 sm:hidden"
            />
          ) : null}
        </div>
      ) : undefined,
  };

  if (onSelect) {
    return (
      <ListRow {...rowProps} asChild className="text-left">
        <button type="button" onClick={onSelect} />
      </ListRow>
    );
  }

  if (href != null) {
    return (
      <ListRow {...rowProps} asChild>
        <Link href={href} />
      </ListRow>
    );
  }

  return <ListRow {...rowProps} />;
}
