// Renders one still per scene to out/stills/ for review before a full render.
import { execFileSync } from "node:child_process";

const frames = process.argv.slice(2).map(Number);
const list = frames.length ? frames : [60, 225, 365, 500, 548, 650, 772, 885];

for (const frame of list) {
  execFileSync(
    "npx",
    ["remotion", "still", "TembaDemo", `out/stills/frame-${String(frame).padStart(3, "0")}.png`, `--frame=${frame}`, "--scale=0.5"],
    { stdio: "inherit" },
  );
}
