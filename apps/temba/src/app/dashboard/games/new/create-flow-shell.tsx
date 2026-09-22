import { ChevronDown, ChevronLeft, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "~/lib/utils";
import {
  CREATE_FLOW_STEP_COUNT,
  type CreateFlowStep,
} from "~/lib/create-game-flow";

const PAD = "px-4 min-[430px]:px-5 md:px-6 xl:px-8";
const BLEED = "-mx-4 min-[430px]:-mx-5 md:-mx-6 xl:-mx-8 md:-mt-6 " + PAD;

export function CreateFlowShell({
  step,
  cancelHref,
  onBack,
  preview,
  futureSteps,
  footer,
  children,
}: {
  step: CreateFlowStep;
  cancelHref: string;
  onBack: () => void;
  preview: ReactNode;
  futureSteps: readonly { step: CreateFlowStep; title: string }[];
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 pb-28 lg:pb-0">
      <header className={cn("bg-ink text-paper py-[22px]", BLEED)}>
        <div className="flex items-center justify-between">
          {step === 1 ? (
            <Link
              href={cancelHref}
              aria-label="Cancel"
              className="focus-visible:ring-paper/50 -ml-2.5 inline-flex size-11 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
            >
              <X aria-hidden="true" className="size-5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="focus-visible:ring-paper/50 -ml-2.5 inline-flex size-11 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
          )}
          <p className="text-dim font-mono text-[10px] uppercase tracking-wide">
            Step {step} of {CREATE_FLOW_STEP_COUNT}
          </p>
        </div>
        <div aria-live="polite" className="mt-4">
          {preview}
        </div>
        <div aria-hidden="true" className="mt-5 grid grid-cols-4 gap-1.5">
          {Array.from({ length: CREATE_FLOW_STEP_COUNT }, (_, index) => (
            <span
              key={index}
              className={cn(
                "h-[3px] rounded-sm",
                index < step ? "bg-paper" : "bg-dimrule",
              )}
            />
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-[26px]">
        {children}
        {futureSteps.length > 0 ? (
          <div className="border-rule flex flex-col gap-3.5 border-t pt-[18px]">
            {futureSteps.map((item) => (
              <div
                key={item.step}
                className="text-muted-foreground flex items-center justify-between"
              >
                <div className="flex items-baseline gap-2.5">
                  <p className="font-expanded text-title">{item.title}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wide">
                    Step {item.step}
                  </p>
                </div>
                <ChevronDown aria-hidden="true" className="size-[18px]" />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "bg-paper border-rule fixed inset-x-0 z-40 border-t py-3.5 lg:static lg:inset-auto lg:z-auto lg:border-0 lg:px-0 lg:py-0",
          PAD,
          "bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))] lg:bottom-auto",
        )}
      >
        {footer}
      </div>
    </div>
  );
}
