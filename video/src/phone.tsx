import { BatteryFull, ChevronLeft, CircleUser, House, Swords, Users, Wifi } from "lucide-react";
import type { ReactNode } from "react";

import { Text } from "./primitives/text";
import { c, sizes } from "./theme";

export const PHONE = {
  width: 680,
  height: 1400,
  bezel: 12,
  radius: 104,
};

/** Logical points the UI is laid out in, as on a 360pt-wide phone. */
export const SCREEN_POINTS = 360;
export const ZOOM = (PHONE.width - PHONE.bezel * 2) / SCREEN_POINTS;
export const SCREEN_HEIGHT_POINTS = (PHONE.height - PHONE.bezel * 2) / ZOOM;

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: PHONE.width,
        height: PHONE.height,
        borderRadius: PHONE.radius,
        background: c.ink,
        padding: PHONE.bezel,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: PHONE.radius - PHONE.bezel,
          background: c.paper,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: SCREEN_POINTS,
            height: SCREEN_HEIGHT_POINTS,
            zoom: ZOOM,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function Signal() {
  return (
    <svg width="17" height="11" viewBox="0 0 17 11">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 4.5} y={8 - i * 2.6} width="3" height={3 + i * 2.6} rx="0.8" fill={c.ink} />
      ))}
    </svg>
  );
}

export function StatusBar() {
  return (
    <div
      style={{
        height: 46,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 26px 0 30px",
        position: "relative",
      }}
    >
      <Text size={15} weight="semibold">
        9:41
      </Text>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 11,
          width: 96,
          height: 28,
          marginLeft: -48,
          borderRadius: 14,
          background: c.ink,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <Signal />
        <Wifi size={16} strokeWidth={2.4} />
        <BatteryFull size={24} strokeWidth={1.8} />
      </div>
    </div>
  );
}

export type Tab = "home" | "games" | "challenges" | "groups" | "profile";

function FieldIcon({ size, strokeWidth }: { size: number; strokeWidth: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M12 4v16" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const TABS: { slot: Tab; title: string; Icon: typeof House | typeof FieldIcon }[] = [
  { slot: "home", title: "Home", Icon: House },
  { slot: "games", title: "Games", Icon: FieldIcon },
  { slot: "challenges", title: "Challenges", Icon: Swords },
  { slot: "groups", title: "Groups", Icon: Users },
  { slot: "profile", title: "Profile", Icon: CircleUser },
];

/** The app's bottom tabs (`app-tabs.tsx`): hairline top, Lucide icons, eyebrow labels. */
export function TabBar({ active }: { active: Tab }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: sizes.bottomTabs + 24,
        borderTop: `1px solid ${c.rule}`,
        background: c.paper,
        display: "flex",
        paddingTop: 7,
        boxSizing: "border-box",
      }}
    >
      {TABS.map(({ slot, title, Icon }) => {
        const on = slot === active;
        return (
          <div
            key={slot}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              color: on ? c.ink : c.muted,
            }}
          >
            <Icon size={sizes.iconTab} strokeWidth={on ? 2.5 : 2} />
            <Text size="eyebrow" weight={on ? "semibold" : "medium"} color={on ? c.ink : c.muted}>
              {title}
            </Text>
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          bottom: 7,
          left: "50%",
          width: 128,
          marginLeft: -64,
          height: 5,
          borderRadius: 3,
          background: c.ink,
        }}
      />
    </div>
  );
}

/** A screen inside the phone: status bar, top bar, content, tabs. */
export function Screen({
  title,
  back = true,
  tab,
  trailing,
  children,
}: {
  title?: string;
  back?: boolean;
  tab: Tab;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, background: c.paper }}>
      <StatusBar />
      {title !== undefined ? <TopBar title={title} back={back} trailing={trailing} /> : null}
      <div style={{ padding: "0 20px" }}>{children}</div>
      <TabBar active={tab} />
    </div>
  );
}


function TopBar({ title, back, trailing }: { title: string; back: boolean; trailing?: ReactNode }) {
  return (
    <div style={{ height: 48, display: "flex", alignItems: "center", padding: "0 14px", gap: 4 }}>
      {back ? <ChevronLeft size={sizes.iconAction + 6} strokeWidth={2} /> : null}
      <Text size="lead" weight="semibold" style={{ flex: 1 }}>
        {title}
      </Text>
      {trailing}
    </div>
  );
}
