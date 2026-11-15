import { Text } from "../primitives/text";
import { c } from "../theme";

const TABS = ["Standing", "Games", "Members"] as const;

/** Group home's tabs (`tabs: { standing, games, members }`): text with an ink underline. */
export function GroupTabs({ active }: { active: (typeof TABS)[number] }) {
  return (
    <div style={{ display: "flex", gap: 22, borderBottom: `1px solid ${c.rule}`, marginTop: 2 }}>
      {TABS.map((tab) => {
        const on = tab === active;
        return (
          <div key={tab} style={{ paddingBottom: 10, borderBottom: on ? `2px solid ${c.ink}` : "2px solid transparent", marginBottom: -1 }}>
            <Text weight={on ? "semibold" : "medium"} muted={!on}>
              {tab}
            </Text>
          </div>
        );
      })}
    </div>
  );
}
