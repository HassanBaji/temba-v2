import { useUser } from "@clerk/expo";
import { colors, sizes } from "@repo/design-tokens";
import { Tabs } from "expo-router";
import { Building2, CircleUser, House, Users } from "lucide-react-native";
import type { ComponentType } from "react";
import type { ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { FieldIcon } from "./field-icon";
import { type TabSlot, visibleTabs } from "./tab-list";

type TabIcon = ComponentType<{
  size: number;
  color: ColorValue;
  strokeWidth?: number;
}>;

const ICONS: Record<TabSlot, TabIcon> = {
  home: House,
  games: FieldIcon,
  groups: Users,
  communities: Building2,
  profile: CircleUser,
};

const ROUTES: Record<TabSlot, string> = {
  home: "(home)",
  games: "games",
  groups: "groups",
  communities: "communities",
  profile: "profile",
};

export function AppTabs() {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const tabs = visibleTabs(user?.publicMetadata.groupCreator === true);
  const shown = new Set(tabs.map((tab) => tab.slot));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopWidth: hairline,
          borderTopColor: colors.rule,
          height: sizes.bottomTabs + insets.bottom,
          paddingBottom: insets.bottom,
        },
      }}
    >
      {(Object.keys(ROUTES) as TabSlot[]).map((slot) => {
        const entry = tabs.find((tab) => tab.slot === slot);
        const Icon = ICONS[slot];
        return (
          <Tabs.Screen
            key={slot}
            name={ROUTES[slot]}
            options={{
              title: entry?.title,
              href: shown.has(slot) ? undefined : null,
              tabBarLabel: ({ focused }) => (
                <Text
                  size="eyebrow"
                  weight={focused ? "semibold" : "medium"}
                  tone={focused ? "default" : "muted"}
                >
                  {entry?.title}
                </Text>
              ),
              tabBarIcon: ({ color, focused }) => (
                <Icon
                  size={sizes.iconTab}
                  color={color}
                  strokeWidth={focused ? 2.5 : 2}
                />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}
