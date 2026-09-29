import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The named type scale in globals.css (`text-body`, `text-meta`, …) must be
// registered as font sizes, or tailwind-merge treats them as text colours and
// drops one of `text-meta text-muted-foreground`. The named radius and
// container widths need the same so they replace other radii and max widths.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "eyebrow",
        "meta",
        "body",
        "lead",
        "title",
        "h2",
        "h1",
        "h1-lg",
        "display",
        "hero",
      ],
      radius: ["card"],
      container: ["content", "wide", "column"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
