import { cn } from "~/lib/utils";

const STEPS = ["Phone", "Verify", "Done"] as const;

export function AuthStepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {STEPS.map((label, index) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
              index < currentStep
                ? "bg-emerald-500 text-white"
                : index === currentStep
                  ? "bg-violet-600 text-white"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {index < currentStep ? "✓" : index + 1}
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={cn(
                "h-0.5 w-8 rounded-full transition-colors",
                index < currentStep ? "bg-emerald-500" : "bg-muted",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
