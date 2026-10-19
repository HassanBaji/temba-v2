import { cn } from "~/lib/utils";

/** The design's 40px hairline controls and 12px muted labels. */
export const controlClass = "rounded-control h-10 min-h-10 shadow-none";

export const labelClass = "text-eyebrow text-muted-foreground font-normal";

export const textareaClass = cn(
  "border-input placeholder:text-muted-foreground rounded-control text-body w-full min-w-0 border bg-transparent px-3 py-2 outline-none",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
  "disabled:cursor-not-allowed disabled:opacity-50",
);
