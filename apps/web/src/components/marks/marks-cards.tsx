"use client";

import { cn } from "~/lib/utils";

import { CoinStack } from "./coin-stack";
import type { ClosedCardModel, GiveRowModel } from "./marks-model";

function CardBody({
  title,
  line,
  coins,
}: {
  title: string;
  line: string;
  coins: GiveRowModel["coins"];
}) {
  return (
    <div className="flex items-center gap-3 px-[18px] py-3.5">
      <CoinStack kinds={coins} size="roster" />
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">{title}</h2>
        <p className="text-muted-foreground text-eyebrow">{line}</p>
      </div>
    </div>
  );
}

/** 2a: "Give your marks", with Choose a player under a hairline. */
export function MarksGiveCard({
  model,
  onPress,
}: {
  model: GiveRowModel;
  onPress: () => void;
}) {
  return (
    <section className="border-ink rounded-card overflow-hidden border">
      <CardBody title={model.title} line={model.line} coins={model.coins} />
      <button
        type="button"
        onClick={onPress}
        className={cn(
          "border-rule bg-paper text-meta flex h-12 w-full items-center justify-center border-t font-semibold outline-none",
          "hover:bg-wash focus-visible:bg-wash focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-inset",
        )}
      >
        {model.actionLabel}
      </button>
    </section>
  );
}

/** 2f: what the viewer gave and when the window closed. */
export function MarksClosedCard({ model }: { model: ClosedCardModel }) {
  return (
    <section className="border-rule rounded-card border">
      <CardBody title={model.title} line={model.line} coins={model.coins} />
    </section>
  );
}
