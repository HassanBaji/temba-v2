import {
  coinDisc,
  coinToneColors,
  coinViewBox,
  markCoinSizes,
  markCoins,
  type CoinElement,
  type CoinState,
  type MarkCoinSize,
} from "@repo/design-tokens/marks";
import type { CoinKind } from "@repo/domain/marks";
import { View } from "react-native";
import Svg, { Circle, Ellipse, Path, Polygon, Rect } from "react-native-svg";

import { Hatch } from "../primitives/hatch";
import { useSurfaceTone } from "../primitives/surface-context";

export type MarkCoinProps = {
  kind: CoinKind;
  size: MarkCoinSize;
  state?: CoinState;
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
      return <Circle {...element.attrs} {...paint} />;
    case "ellipse":
      return <Ellipse {...element.attrs} {...paint} />;
    case "rect":
      return <Rect {...element.attrs} {...paint} />;
    case "path":
      return <Path {...element.attrs} {...paint} />;
    case "polygon":
      return <Polygon {...element.attrs} {...paint} />;
  }
}

/** A Mark or MVP coin. Decorative: the text beside it names the mark. */
export function MarkCoin({ kind, size, state = "earned" }: MarkCoinProps) {
  const surface = useSurfaceTone();
  const px = markCoinSizes[size];
  const tones = coinToneColors(kind, state, surface);
  const discRadius = (coinDisc.r / coinViewBox) * px;
  const discInset = px / 2 - discRadius;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{ width: px, height: px }}
    >
      {state === "notYet" ? (
        <Hatch
          radius={discRadius}
          style={{
            top: discInset,
            right: discInset,
            bottom: discInset,
            left: discInset,
          }}
        />
      ) : null}
      <Svg width={px} height={px} viewBox={`0 0 ${coinViewBox} ${coinViewBox}`}>
        {markCoins[kind].elements.map((element, index) => {
          const colour = tones[element.tone];
          return colour === null ? null : (
            <CoinShape key={index} element={element} colour={colour} />
          );
        })}
      </Svg>
    </View>
  );
}
