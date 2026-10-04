import { spacing } from "@repo/design-tokens";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { Card } from "./card";
import type { Slot } from "./home-model";

function Failure({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card>
      <View
        style={{ padding: spacing.surface, gap: 8 }}
        accessibilityRole="alert"
      >
        <Text size="lead" weight="semibold">
          {title}
        </Text>
        <Text size="meta" tone="muted">
          {message}
        </Text>
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          <Button label="Try again" variant="outline" onPress={onRetry} />
        </View>
      </View>
    </Card>
  );
}

function CardSkeleton({ height }: { height: number }) {
  return <Skeleton height={height} radius={16} />;
}

export function Block<T>({
  slot,
  title,
  skeletonHeight,
  onRetry,
  children,
}: {
  slot: Slot<T>;
  title: string;
  skeletonHeight: number;
  onRetry: () => void;
  children: (value: T) => React.ReactNode;
}) {
  if (slot.status === "loading") {
    return <CardSkeleton height={skeletonHeight} />;
  }
  if (slot.status === "error") {
    return (
      <Failure
        title={`${title} could not be loaded`}
        message={slot.message}
        onRetry={onRetry}
      />
    );
  }
  return <>{children(slot.value)}</>;
}
