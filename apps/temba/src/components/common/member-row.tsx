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
}: {
  name: string;
  image?: string | null;
  isViewer?: boolean;
  meta?: ReactNode;
  badge?: ReactNode;
  trailing?: ReactNode;
  size?: "default" | "lg";
}) {
  const hasTrailing = badge != null || trailing != null;

  return (
    <ListRow
      size={size}
      leading={<UserAvatar name={name} image={image} size="lg" />}
      title={
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{name}</span>
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
    />
  );
}
