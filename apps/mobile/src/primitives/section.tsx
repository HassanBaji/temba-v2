import { View } from "react-native";

import { Text } from "./text";

const TITLE_GAP = 12;

export type SectionProps = {
  title?: string;
  children: React.ReactNode;
};

export function Section({ title, children }: SectionProps) {
  return (
    <View style={{ gap: TITLE_GAP }}>
      {title ? (
        <Text size="title" weight="semibold" accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
