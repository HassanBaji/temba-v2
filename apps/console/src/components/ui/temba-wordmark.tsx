import { TembaMark } from "~/components/ui/icons/temba-mark";
import { cn } from "~/lib/utils";

export function TembaWordmark({
  surface = "paper",
  className,
}: {
  surface?: "paper" | "ink";
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-[11px]", className)}>
      <TembaMark
        height={26}
        variant={surface === "ink" ? "reversed" : "reduction"}
        width={26}
      />
      <span className="font-display text-title tracking-[0.2em]">TEMBA</span>
    </span>
  );
}
