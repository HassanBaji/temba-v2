import {
  coinDisc,
  coinToneColors,
  coinViewBox,
  markCoinSizes,
  markCoins,
  type CoinElement,
  type CoinGreys,
  type CoinState,
  type MarkCoinSize,
} from "@repo/design-tokens/marks";
import type { CoinKind } from "@repo/domain/marks";
import type { SurfaceTone } from "@repo/domain/surface-tone";

import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";

const DISC_INSET = `${((coinDisc.cx - coinDisc.r) / coinViewBox) * 100}%`;

// A not-yet glyph follows the scheme through the theme variables, as Hatch does.
const THEME_GREYS: CoinGreys = {
  rule: "var(--color-rule)",
  muted: "var(--color-muted-foreground)",
  paper: "var(--color-paper)",
  dimrule: "var(--color-dimrule)",
  dim: "var(--color-dim)",
  focus: "var(--color-focus)",
};

function CoinShape({
  element,
  colour,
}: {
  element: CoinElement;
  colour: string;
}) {
  const paint =
    element.paint === "stroke"
      ? { fill: "none", stroke: colour }
      : { fill: colour };
  switch (element.shape) {
    case "circle":
      return <circle {...element.attrs} {...paint} />;
    case "ellipse":
      return <ellipse {...element.attrs} {...paint} />;
    case "rect":
      return <rect {...element.attrs} {...paint} />;
    case "path":
      return <path {...element.attrs} {...paint} />;
    case "polygon":
      return <polygon {...element.attrs} {...paint} />;
  }
}

/** A Mark or MVP coin. Decorative: the text beside it names the mark. */
export function MarkCoin({
  kind,
  size,
  state = "earned",
  tone = "paper",
  className,
}: {
  kind: CoinKind;
  size: MarkCoinSize;
  state?: CoinState;
  /** The surface the coin sits on; a not-yet coin takes its hatch and glyph tones from it. */
  tone?: SurfaceTone;
  className?: string;
}) {
  const px = markCoinSizes[size];
  const tones = coinToneColors(kind, state, tone, THEME_GREYS);

  return (
    <span
      data-slot="mark-coin"
      data-state={state}
      aria-hidden="true"
      className={cn("relative block shrink-0", className)}
      style={{ width: px, height: px }}
    >
      {state === "notYet" ? (
        <Hatch
          tone={tone}
          className="absolute rounded-full"
          style={{ inset: DISC_INSET }}
        />
      ) : null}
      <svg
        viewBox={`0 0 ${coinViewBox} ${coinViewBox}`}
        width={px}
        height={px}
        className="relative block"
      >
        {markCoins[kind].elements.map((element, index) => {
          const colour = tones[element.tone];
          return colour === null ? null : (
            <CoinShape key={index} element={element} colour={colour} />
          );
        })}
      </svg>
    </span>
  );
}
