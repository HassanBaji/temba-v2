"use client";

import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function safeErrorMessage(
  message: string | undefined,
  fallback: string,
) {
  if (!message) {
    return fallback;
  }
  if (
    message.includes("\n") ||
    message.includes("    at ") ||
    /digest/i.test(message)
  ) {
    return fallback;
  }
  return message;
}

export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel,
  secondaryAction,
  headingLevel = 2,
  variant = "page",
  className,
}: {
  title?: string;
  message?: string;
  onRetry: () => void;
  retryLabel?: string;
  secondaryAction?: ReactNode;
  headingLevel?: 1 | 2 | 3;
  variant?: "page" | "inline";
  className?: string;
}) {
  const m = useMessages();
  const heading = title ?? m.webUi.errorState.title;
  const retry = retryLabel ?? m.common.tryAgain;
  const body = safeErrorMessage(message, m.webUi.errorState.fallback);
  if (variant === "inline") {
    return (
      <div
        role="alert"
        className={cn(
          "border-rule bg-paper text-meta flex items-center gap-3 rounded-xl border px-[22px] py-4",
          className,
        )}
      >
        <CircleAlert
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0"
          strokeWidth={1.75}
        />
        <p className="min-w-0 flex-1">
          <span className="font-semibold">{heading}.</span>{" "}
          <span className="text-muted-foreground">{body}</span>
        </p>
        <Button
          variant="link"
          size="sm"
          className="text-meta h-auto min-h-0 shrink-0 px-0"
          onClick={onRetry}
          type="button"
        >
          {retry}
        </Button>
        {secondaryAction}
      </div>
    );
  }

  const Heading = ({ 1: "h1", 2: "h2", 3: "h3" } as const)[headingLevel];
  return (
    <div
      role="alert"
      className={cn(
        "mx-auto flex w-full max-w-md flex-col items-center gap-3 py-12 text-center",
        className,
      )}
    >
      <CircleAlert
        aria-hidden="true"
        className="text-muted-foreground size-8"
        strokeWidth={1.75}
      />
      <Heading className="text-title font-semibold">{heading}</Heading>
      <p className="text-body text-muted-foreground">{body}</p>
      <Button className="min-h-11" onClick={onRetry} type="button">
        {retry}
      </Button>
      {secondaryAction}
    </div>
  );
}
