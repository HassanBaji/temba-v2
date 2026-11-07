"use client";

import type { MarkCoinSize } from "@repo/design-tokens/marks";
import {
  COIN_KINDS,
  GIVER_GROUPS,
  MARK_META,
  giverGroupLabel,
  markDescription,
  markName,
  type CoinKind,
} from "@repo/domain/marks";
import { sportLabel } from "@repo/domain/sport";

import { useLocale } from "~/components/locale-provider";
import { MarkCoin } from "~/components/marks/mark-coin";
import { Surface } from "~/components/ui/surface";

const SMALL_SIZES: MarkCoinSize[] = ["cabinet", "row"];

/** The set (mockup 0a): every coin at 120, 44 and 20, earned and not yet. */
function CoinEntry({ kind }: { kind: CoinKind }) {
  const locale = useLocale();
  const sports = kind === "mvp" ? [] : MARK_META[kind].sports;

  return (
    <li className="border-rule flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-center gap-4">
        <MarkCoin kind={kind} size="set" />
        <MarkCoin kind={kind} size="set" state="notYet" />
      </div>
      {SMALL_SIZES.map((size) => (
        <div key={size} className="flex items-center gap-3">
          <MarkCoin kind={kind} size={size} />
          <MarkCoin kind={kind} size={size} state="notYet" />
        </div>
      ))}
      <div className="space-y-1">
        <p className="text-lead font-semibold">{markName(kind, "en")}</p>
        <p className="text-lead font-semibold" dir="rtl" lang="ar">
          {markName(kind, "ar")}
        </p>
        <p className="text-muted-foreground text-meta">
          {markDescription(kind, locale)}
        </p>
        {sports.length === 1 ? (
          <p className="text-muted-foreground text-meta">
            {sports.map((sport) => sportLabel(sport, locale)).join(", ")}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function CoinGroup({ title, kinds }: { title: string; kinds: CoinKind[] }) {
  return (
    <section className="space-y-4">
      <h2 className="text-title font-semibold">{title}</h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-4">
        {kinds.map((kind) => (
          <CoinEntry key={kind} kind={kind} />
        ))}
      </ul>
    </section>
  );
}

export function MarksSet() {
  const locale = useLocale();

  return (
    <div className="space-y-10">
      {GIVER_GROUPS.map((group) => (
        <CoinGroup
          key={group}
          title={giverGroupLabel(group, locale)}
          kinds={COIN_KINDS.filter(
            (kind) => kind !== "mvp" && MARK_META[kind].group === group,
          )}
        />
      ))}
      <CoinGroup title={markName("mvp", locale)} kinds={["mvp"]} />
      <Surface tone="ink" radius="surface" className="flex flex-wrap gap-3 p-5">
        {COIN_KINDS.map((kind) => (
          <div key={kind} className="flex gap-2">
            <MarkCoin kind={kind} size="cabinet" tone="ink" />
            <MarkCoin kind={kind} size="cabinet" state="notYet" tone="ink" />
          </div>
        ))}
      </Surface>
    </div>
  );
}
