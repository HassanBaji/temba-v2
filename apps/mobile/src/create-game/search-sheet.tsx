import { radii, sizes } from "@repo/design-tokens";
import { Fragment, useState } from "react";
import { Pressable, View } from "react-native";

import { ChoiceCard } from "../primitives/choice-card";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { SearchField } from "../primitives/search-field";
import { Sheet } from "../primitives/sheet";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

export type SearchSheetRow = {
  id: string;
  title: string;
  description?: string;
};

export function SearchSheet({
  visible,
  title,
  placeholder,
  listLabel,
  initialQuery = "",
  selectedId,
  filter,
  resultLabel,
  emptyMessage,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  listLabel: string;
  initialQuery?: string;
  selectedId: string;
  filter: (query: string) => readonly SearchSheetRow[];
  resultLabel: (query: string, count: number) => string;
  emptyMessage: (query: string) => string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const rows = filter(query);
  const close = () => {
    setQuery("");
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={title}
      tall
      keyboardShouldPersistTaps="handled"
      action={<CancelAction onPress={close} />}
    >
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        autoFocus
      />
      <Text size="eyebrow" mono tone="muted" accessibilityLiveRegion="polite">
        {resultLabel(query, rows.length)}
      </Text>
      {rows.length === 0 ? (
        <Text tone="muted">{emptyMessage(query.trim())}</Text>
      ) : (
        <ResultList label={listLabel}>
          {rows.map((row, index) => (
            <Fragment key={row.id}>
              {index > 0 ? <Hairline /> : null}
              <ChoiceCard
                role="radio"
                variant="row"
                trailing="check"
                selected={row.id === selectedId}
                title={row.title}
                description={row.description}
                onPress={() => {
                  onPick(row.id);
                  close();
                }}
              />
            </Fragment>
          ))}
        </ResultList>
      )}
    </Sheet>
  );
}

function ResultList({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const palette = useTonePalette();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{
        borderRadius: radii.card,
        borderWidth: hairline,
        borderColor: palette.rule,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

function CancelAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cancel"
      onPress={onPress}
      style={{
        minWidth: sizes.touchTarget,
        height: sizes.touchTarget,
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <Text weight="medium">Cancel</Text>
    </Pressable>
  );
}
