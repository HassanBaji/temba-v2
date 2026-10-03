import { ChevronDown } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";

import { BackButton, CloseButton } from "~/components/ui/nav-icon-button";
import { Skeleton } from "~/components/ui/skeleton";
import { pageBleed, pageGutterX } from "~/lib/page-layout";
import { cn } from "~/lib/utils";
import {
  CREATE_FLOW_STEP_COUNT,
  type CreateFlowStep,
} from "~/lib/create-game-flow";

const BLEED = `${pageBleed} md:-mt-6`;

export function CreateFlowShell({
  step,
  cancelHref,
  onCancel,
  onBack,
  preview,
  futureSteps,
  footer,
  children,
}: {
  step: CreateFlowStep;
  cancelHref: string;
  onCancel: (event: MouseEvent<HTMLAnchorElement>) => void;
  onBack: () => void;
  preview: ReactNode;
  futureSteps: readonly { step: CreateFlowStep; title: string }[];
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 pb-28 lg:pb-0">
      <header className={cn("surface-ink bg-ink text-paper py-[22px]", BLEED)}>
        <div className="flex items-center justify-between">
          {step === 1 ? (
            <CloseButton
              label="Cancel"
              surface="ink"
              href={cancelHref}
              onClick={onCancel}
            />
          ) : (
            <BackButton surface="ink" onClick={onBack} />
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
          pageGutterX,
          "bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))] lg:bottom-auto",
        )}
      >
        {footer}
      </div>
    </div>
  );
}

export function CreateFlowSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Loading</span>
      <div
        aria-hidden="true"
        className={cn("surface-ink bg-ink py-[22px]", BLEED)}
      >
        <div className="flex h-11 items-center justify-between">
          <Skeleton className="bg-dimrule size-11 rounded-full" />
          <Skeleton className="bg-dimrule h-3 w-20" />
        </div>
        <Skeleton className="bg-dimrule mt-4 h-7 w-48" />
        <div className="mt-5 grid grid-cols-4 gap-1.5">
          {Array.from({ length: CREATE_FLOW_STEP_COUNT }, (_, index) => (
            <span key={index} className="bg-dimrule h-[3px] rounded-sm" />
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="rounded-card h-[124px] w-full" />
        <Skeleton className="rounded-card h-[124px] w-full" />
      </div>
    </div>
  );
}
