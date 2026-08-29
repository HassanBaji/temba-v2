import { CircleAlert } from "lucide-react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function safeErrorMessage(message: string | undefined) {
  if (!message) {
    return "Something went wrong. Try again.";
  }
  if (
    message.includes("\n") ||
    message.includes("    at ") ||
    /digest/i.test(message)
  ) {
    return "Something went wrong. Try again.";
  }
  return message;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  title?: string;
  message?: string;
  onRetry: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "mx-auto flex w-full max-w-[var(--container-content)] flex-col items-center gap-3 py-12 text-center",
        className,
      )}
    >
      <CircleAlert
        aria-hidden="true"
        className="text-muted-foreground size-8"
        strokeWidth={1.75}
      />
      <h2 className="text-title font-semibold">{title}</h2>
      <p className="text-body text-muted-foreground">
        {safeErrorMessage(message)}
      </p>
      <Button className="min-h-11" onClick={onRetry} type="button">
        {retryLabel}
      </Button>
    </div>
  );
}
