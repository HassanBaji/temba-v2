import { Sheet } from "../primitives/sheet";
import { SheetMenu, SheetMenuRow } from "../primitives/sheet-menu";

export type PlayedMenuItem = {
  key: string;
  label: string;
  hint?: string | null;
  disabled?: boolean;
  tone?: "default" | "danger";
  onPress: () => void;
};

/** What the Organizer can still do with a played Game. */
export function PlayedMenuSheet({
  visible,
  title,
  items,
  onClose,
}: {
  visible: boolean;
  title: string;
  items: PlayedMenuItem[];
  onClose: () => void;
}) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      titleSize="lead"
      closeButton
    >
      <SheetMenu>
        {items.map((item) => (
          <SheetMenuRow
            key={item.key}
            label={item.label}
            hint={item.hint}
            disabled={item.disabled}
            tone={item.tone}
            onPress={() => {
              onClose();
              item.onPress();
            }}
          />
        ))}
      </SheetMenu>
    </Sheet>
  );
}
