import { Redirect } from "expo-router";
import { Plus } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { sizes, typeScale, numerals } from "@repo/design-tokens";
import type { ResultMarkVariant } from "@repo/domain/result-mark";

import { Avatar } from "../src/primitives/avatar";
import { Button } from "../src/primitives/button";
import { FormSlot } from "../src/primitives/form-slot";
import { Hairline } from "../src/primitives/hairline";
import { Hatch } from "../src/primitives/hatch";
import { MountDraw } from "../src/primitives/mount-draw";
import { MountFill } from "../src/primitives/mount-fill";
import { ResultMark } from "../src/primitives/result-mark";
import { Screen } from "../src/primitives/screen";
import { Section } from "../src/primitives/section";
import { Sheet } from "../src/primitives/sheet";
import { Skeleton } from "../src/primitives/skeleton";
import { Surface } from "../src/primitives/surface";
import { Text } from "../src/primitives/text";
import { useToast } from "../src/primitives/toast";

const VARIANTS: ResultMarkVariant[] = ["won", "lost", "draw", "not-played"];
const WEIGHTS = ["regular", "medium", "semibold", "bold"] as const;
const SCALE = Object.keys(typeScale) as (keyof typeof typeScale)[];
const NUMERALS = Object.keys(numerals) as (keyof typeof numerals)[];
const LEVEL_PATH = "M0,40 C30,38 50,20 80,22 C110,24 130,6 160,4";
const LEVEL_PATH_LENGTH = 175;

function HatchSwatch() {
  return (
    <View style={{ width: 64, height: 64 }}>
      <Hatch />
    </View>
  );
}

function Marks() {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
        {VARIANTS.map((variant) => (
          <ResultMark key={variant} variant={variant} size={32} />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {VARIANTS.map((variant) => (
          <FormSlot key={variant} variant={variant} />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {VARIANTS.map((variant) => (
          <FormSlot key={variant} variant={variant} compact />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {Array.from({ length: 10 }, (_, index) => (
          <FormSlot key={index} variant="not-played" />
        ))}
      </View>
    </View>
  );
}

function TypeSamples() {
  return (
    <View style={{ gap: 6 }}>
      {SCALE.map((size) => (
        <Text key={size} size={size} numberOfLines={1}>
          {size} 0123456789
        </Text>
      ))}
      {WEIGHTS.map((weight) => (
        <Text key={weight} weight={weight}>
          {weight} 0123456789
        </Text>
      ))}
      <Text tone="muted">muted 0123456789</Text>
      <Text size="eyebrow" mono uppercase>
        micro-label
      </Text>
      {NUMERALS.map((size) => (
        <Text key={size} size={size} width="expanded" weight="bold">
          {numerals[size] > 60 ? "1,234" : "1,234.56"}
        </Text>
      ))}
    </View>
  );
}

function Buttons() {
  const toast = useToast();
  return (
    <View style={{ gap: 8 }}>
      <Button label="Create Game" onPress={() => toast.show("Game created")} />
      <Button label="Outline" variant="outline" />
      <Button label="Small" size="sm" />
      <Button label="Large" size="lg" />
      <Button label="Pending" pending />
      <Button label="Disabled" disabled />
      <Button label="Add" size="icon" icon={<Plus size={sizes.iconAction} />} />
    </View>
  );
}

function Everything({ onOpenSheet }: { onOpenSheet?: () => void }) {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
        <HatchSwatch />
        <Text tone="muted" size="meta">
          Hatch: not yet
        </Text>
      </View>
      <Marks />
      <TypeSamples />
      <Hairline />
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Avatar name="Hassan Udyh" size="sm" />
        <Avatar name="Hassan Udyh" />
        <Avatar name="Hassan Udyh" size="lg" />
        <Skeleton width={96} height={16} />
      </View>
      <Buttons />
      {onOpenSheet ? (
        <Button label="Open sheet" variant="outline" onPress={onOpenSheet} />
      ) : null}
    </View>
  );
}

export default function Gallery() {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <Screen>
      <Text size="h2" weight="semibold">
        Gallery
      </Text>
      <Section title="Paper">
        <Surface tone="paper">
          <Everything onOpenSheet={() => setSheetOpen(true)} />
        </Surface>
      </Section>
      <Section title="Ink">
        <Surface tone="ink">
          <Everything />
        </Surface>
      </Section>
      <Section title="Motion">
        <MountFill percent={64} />
        <MountDraw
          d={LEVEL_PATH}
          length={LEVEL_PATH_LENGTH}
          width={160}
          height={44}
        />
      </Section>
      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Sheet"
      >
        <Text tone="muted">A scrim and a hairline. No shadow.</Text>
        <Button label="Close" onPress={() => setSheetOpen(false)} />
      </Sheet>
    </Screen>
  );
}
