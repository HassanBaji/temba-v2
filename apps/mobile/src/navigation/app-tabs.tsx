import { colors, sizes } from "@repo/design-tokens";
import { Tabs, useSegments } from "expo-router";
import type { BottomTabScreenProps } from "expo-router/js-tabs";
import {
  CommonActions,
  type ParamListBase,
} from "expo-router/react-navigation";
import {
  Building2,
  CalendarCheck,
  CircleUser,
  House,
  Users,
} from "lucide-react-native";
import type { ComponentType } from "react";
import type { ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { FieldIcon } from "./field-icon";
import {
  stackMissingRoot,
  tabBarHidden,
  type TabSlot,
  visibleTabs,
} from "./tab-list";

type TabIcon = ComponentType<{
  size: number;
  color: ColorValue;
  strokeWidth?: number;
}>;

const ICONS: Record<TabSlot, TabIcon> = {
  home: House,
  games: FieldIcon,
  book: CalendarCheck,
  groups: Users,
  communities: Building2,
  profile: CircleUser,
};

const ROUTES: Record<TabSlot, string> = {
  home: "(home)",
  games: "games",
  book: "book",
  groups: "groups",
  communities: "communities",
  profile: "profile",
};

export function AppTabs() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const tabs = visibleTabs();
  const shown = new Set(tabs.map((tab) => tab.slot));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: tabBarHidden(segments)
          ? { display: "none" }
          : {
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
            listeners={({
              navigation,
              route,
            }: BottomTabScreenProps<ParamListBase>) => ({
              tabPress: (event) => {
                if (!navigation.isFocused()) {
                  return;
                }
                const stack = navigation
                  .getState()
                  .routes.find((tab) => tab.key === route.key)?.state;
                if (!stackMissingRoot(stack)) {
                  return;
                }
                event.preventDefault();
                navigation.dispatch({
                  ...CommonActions.reset({
                    index: 0,
                    routes: [{ name: "index" }],
                  }),
                  target: stack.key,
                });
              },
            })}
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
