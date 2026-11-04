"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "~/lib/utils";

/** A 50 by 30 track with a round thumb: ink when on, input grey when off. */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "focus-visible:ring-ring/50 data-[state=checked]:bg-ink data-[state=unchecked]:bg-input relative inline-flex h-[30px] w-[50px] shrink-0 cursor-pointer items-center rounded-full outline-none transition-colors focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="bg-paper pointer-events-none block size-6 translate-x-[3px] rounded-full transition-transform data-[state=checked]:translate-x-[23px] rtl:-translate-x-[3px] rtl:data-[state=checked]:-translate-x-[23px]"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
