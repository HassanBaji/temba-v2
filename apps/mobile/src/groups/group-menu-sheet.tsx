import {
  GROUP_MENU_LABELS,
  type GroupMenuItem,
} from "@repo/domain/group-settings";
import { Link, LogOut, Pencil, UserRoundPlus, X } from "lucide-react-native";
import { View } from "react-native";

import { HeaderIconButton } from "../primitives/screen-header";
import { Sheet } from "../primitives/sheet";
import { SheetMenu, SheetMenuRow } from "../primitives/sheet-menu";

const ICONS = {
  edit: Pencil,
  invite: UserRoundPlus,
  copy_link: Link,
  leave: LogOut,
} as const;

/** The More menu on Group home (design "Group create and edit flow" 02). */
export function GroupMenuSheet({
  visible,
  name,
  roleLine,
  items,
  copyPending,
  onPick,
  onClose,
}: {
  visible: boolean;
  name: string;
  roleLine: string | null;
  items: GroupMenuItem[];
  copyPending: boolean;
  onPick: (item: GroupMenuItem) => void;
  onClose: () => void;
}) {
  const actions = items.filter((item) => item !== "leave");
  const canLeave = items.includes("leave");
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={name}
      subtitle={roleLine}
      action={
        <HeaderIconButton
          framed
          icon={X}
          accessibilityLabel="Close"
          onPress={onClose}
        />
      }
    >
      <View style={{ gap: 12 }}>
        {actions.length > 0 ? (
          <SheetMenu>
            {actions.map((item) => (
              <SheetMenuRow
                key={item}
                label={GROUP_MENU_LABELS[item]}
                icon={ICONS[item]}
                trailing="chevron"
                pending={item === "copy_link" && copyPending}
                onPress={() => onPick(item)}
              />
            ))}
          </SheetMenu>
        ) : null}
        {canLeave ? (
          <SheetMenu>
            {[
              <SheetMenuRow
                key="leave"
                label={GROUP_MENU_LABELS.leave}
                icon={LogOut}
                onPress={() => onPick("leave")}
              />,
            ]}
          </SheetMenu>
        ) : null}
      </View>
    </Sheet>
  );
}
