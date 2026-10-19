import { Check } from "lucide-react";

import {
  ConsoleCard,
  ConsoleCardHeader,
} from "~/components/console/console-card";

import { MANAGER_CAPABILITIES } from "./staff-model";

export function ManagerCapabilitiesCard() {
  return (
    <ConsoleCard className="overflow-hidden text-[13px]">
      <ConsoleCardHeader title="What a Venue manager can do" />
      <ul className="divide-border divide-y">
        {MANAGER_CAPABILITIES.map((capability) => (
          <li
            key={capability}
            className="flex items-center justify-between gap-3 px-5 py-[11px]"
          >
            <span>{capability}</span>
            <Check aria-hidden="true" className="size-3.5 shrink-0" />
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground border-border border-t px-5 py-3 text-xs">
        One role today. Only an Operator adds or removes managers.
      </p>
    </ConsoleCard>
  );
}
