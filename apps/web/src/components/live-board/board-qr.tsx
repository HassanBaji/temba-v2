import { encode } from "uqr";

import { cn } from "~/lib/utils";

/**
 * A QR code as one SVG path on a solid tile: the tile is ink and the modules
 * paper, so it reads on the dark board and the light one alike.
 */
export function BoardQr({
  value,
  size,
  className,
}: {
  value: string;
  size: number;
  className?: string;
}) {
  const { data, size: modules } = encode(value, { ecc: "M", border: 2 });
  let path = "";
  data.forEach((row, y) => {
    row.forEach((on, x) => {
      if (on) {
        path += `M${x} ${y}h1v1h-1z`;
      }
    });
  });
  return (
    <svg
      aria-hidden="true"
      className={cn("bg-ink block shrink-0 rounded-[8px]", className)}
      height={size}
      shapeRendering="crispEdges"
      viewBox={`0 0 ${modules} ${modules}`}
      width={size}
    >
      <path className="fill-paper" d={path} />
    </svg>
  );
}
