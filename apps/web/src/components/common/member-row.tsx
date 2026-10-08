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
}: {
  name: string;
  image?: string | null;
  isViewer?: boolean;
  meta?: ReactNode;
  badge?: ReactNode;
  trailing?: ReactNode;
  size?: "default" | "lg";
  href?: string;
}) {
  const hasTrailing = badge != null || trailing != null;

  return (
    <ListRow
      asChild={href != null}
      size={size}
      leading={<UserAvatar name={name} image={image} size="lg" />}
      title={
        // Wraps instead of truncating: trailing form and level columns leave
        // a narrow name column at 360px, and the You tag must stay visible.
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 whitespace-normal">
          <span className="min-w-0 break-words">{name}</span>
          {isViewer ? <YouTag /> : null}
        </span>
      }
      meta={meta}
      trailing={
        hasTrailing ? (
          <div className="flex items-center gap-2">
            {badge}
            {trailing}
          </div>
        ) : undefined
      }
    >
      {href != null ? <Link href={href} /> : undefined}
    </ListRow>
  );
}
