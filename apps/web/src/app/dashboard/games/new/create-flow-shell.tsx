import { Surface } from "~/components/ui/surface";
import type { MouseEvent, ReactNode } from "react";

import { BackButton, CloseButton } from "~/components/ui/nav-icon-button";
import { Skeleton } from "~/components/ui/skeleton";
import { pageBleed, pageGutterX } from "~/lib/page-layout";
import { cn } from "~/lib/utils";
import {
  CREATE_FLOW_STEP_COUNT,
  type CreateFlowStep,
} from "@repo/domain/create-game-flow";

const BLEED = `${pageBleed} md:-mt-6`;

export function CreateFlowShell({
  step,
  cancelHref,
  onCancel,
  onBack,
  preview,
  footer,
  children,
}: {
  step: CreateFlowStep;
  cancelHref: string;
  onCancel: (event: MouseEvent<HTMLAnchorElement>) => void;
  onBack: () => void;
  preview: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 pb-28 lg:pb-0">
      <Surface as="header" tone="ink" className={cn("py-[22px]", BLEED)}>
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
      </Surface>

      <div className="flex flex-col gap-[26px]">
        {children}
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
      <Surface
        as="div"
        tone="ink"
        aria-hidden="true"
        className={cn("py-[22px]", BLEED)}
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
      </Surface>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="rounded-card h-[124px] w-full" />
        <Skeleton className="rounded-card h-[124px] w-full" />
      </div>
    </div>
  );
}
