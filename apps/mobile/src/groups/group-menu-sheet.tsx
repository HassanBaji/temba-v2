import {
  groupMenuLabel,
  type GroupMenuItem,
} from "@repo/domain/group-settings";
import { Link, LogOut, Pencil, UserRoundPlus } from "lucide-react-native";

import { useLocale } from "../i18n/locale-provider";
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
  const locale = useLocale();
  const actions = items.filter((item) => item !== "leave");
  const canLeave = items.includes("leave");
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={name}
      subtitle={roleLine}
      titleSize="lead"
      closeButton
    >
      {actions.length > 0 ? (
        <SheetMenu>
          {actions.map((item) => (
            <SheetMenuRow
              key={item}
              label={groupMenuLabel(item, locale)}
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
              label={groupMenuLabel("leave", locale)}
              icon={LogOut}
              tone="danger"
              onPress={() => onPick("leave")}
            />,
          ]}
        </SheetMenu>
      ) : null}
    </Sheet>
  );
}
