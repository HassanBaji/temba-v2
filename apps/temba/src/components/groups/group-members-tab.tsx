import { Users } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { RoleBadge } from "~/components/temba/role-badge";

export function GroupMembersTab({
  members,
}: {
  members: { userId: string; name: string }[];
}) {
  if (members.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No members yet"
        description="People who join this Group will show up here."
      />
    );
  }

  return (
    <RowList>
      {members.map((member) => (
        <ListRow
          key={member.userId}
          leading={<UserAvatar name={member.name} size="lg" />}
          title={member.name}
          trailing={<RoleBadge role="member" />}
        />
      ))}
    </RowList>
  );
}
