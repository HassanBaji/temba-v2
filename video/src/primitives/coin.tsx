import { coinToneColors, coinViewBox, markCoins, type CoinElement } from "../../../packages/design-tokens/src/marks";
import type { MarkKind } from "../data";

function Shape({ element, colour }: { element: CoinElement; colour: string }) {
  const paint = element.paint === "stroke" ? { fill: "none", stroke: colour } : { fill: colour };
  const { shape, attrs } = element;
  if (shape === "circle") return <circle {...attrs} {...paint} />;
  if (shape === "ellipse") return <ellipse {...attrs} {...paint} />;
  if (shape === "rect") return <rect {...attrs} {...paint} />;
  if (shape === "polygon") return <polygon {...attrs} {...paint} />;
  return <path {...attrs} {...paint} />;
}

/** A Mark or MVP coin (`mark-coin.tsx`): the only colour in the system. */
export function MarkCoin({ kind, size }: { kind: MarkKind; size: number }) {
  const tones = coinToneColors(kind, "earned");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${coinViewBox} ${coinViewBox}`} style={{ display: "block", flexShrink: 0 }}>
      {markCoins[kind].elements.map((element, i) => {
        const colour = tones[element.tone];
        return colour ? <Shape key={i} element={element} colour={colour} /> : null;
      })}
    </svg>
  );
}
