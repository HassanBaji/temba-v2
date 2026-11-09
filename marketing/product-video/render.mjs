// Renders scene.html frame by frame with Playwright and pipes PNGs to ffmpeg.
//   node render.mjs                     all frames -> out/frames.mp4 (video only)
//   node render.mjs --stills 2,17.5,40  PNG stills -> out/stills/
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = dirname(fileURLToPath(import.meta.url));
const TL = JSON.parse(await readFile(join(root, "timeline.json"), "utf8"));
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".ttf": "font/ttf" };

const server = createServer(async (req, res) => {
  try {
    const path = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!path.startsWith(root)) throw new Error("outside");
    res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/scene.html`;

const args = process.argv.slice(2);
const stillsArg = args.includes("--stills") ? args[args.indexOf("--stills") + 1] : null;
const workers = Number(args.includes("--workers") ? args[args.indexOf("--workers") + 1] : 6);
const scale = Number(args.includes("--scale") ? args[args.indexOf("--scale") + 1] : 1);

const browser = await chromium.launch();
async function openPage() {
  const page = await browser.newPage({ viewport: { width: TL.width, height: TL.height }, deviceScaleFactor: scale });
  await page.addInitScript((tl) => {
    window.TL = tl;
    window.__RENDER__ = true;
  }, TL);
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    window.renderAt(0);
    await document.fonts.load('700 40px "Plex"', "ع");
    await document.fonts.load('400 40px "Plex"', "ع");
    await document.fonts.load('40px "Num"', "0");
    await document.fonts.load('700 40px "Sora"', "T");
  });
  return page;
}
const shot = async (page, t) => {
  await page.evaluate((x) => window.renderAt(x), t);
  return page.screenshot({ type: "png" });
};

if (stillsArg) {
  mkdirSync(join(root, "out/stills"), { recursive: true });
  const page = await openPage();
  for (const t of stillsArg.split(",").map(Number)) {
    const png = await shot(page, t);
    await import("node:fs").then((fs) => fs.writeFileSync(join(root, `out/stills/t${t.toFixed(2)}.png`), png));
  }
} else {
  mkdirSync(join(root, "out"), { recursive: true });
  const total = Math.round(TL.duration * TL.fps);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(TL.fps), "-c:v", "png", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-tune", "animation", "-pix_fmt", "yuv420p", "-r", String(TL.fps), join(root, "out/frames.mp4")], { stdio: ["pipe", "inherit", "inherit"] });
  const pages = await Promise.all(Array.from({ length: workers }, openPage));
  const pending = new Map();
  let next = 0;
  let written = 0;
  const flush = async () => {
    while (pending.has(written)) {
      const buf = pending.get(written);
      pending.delete(written);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
      written++;
      if (written % 150 === 0) console.log(`frame ${written}/${total}`);
    }
  };
  await Promise.all(pages.map(async (page) => {
    while (next < total) {
      const i = next++;
      pending.set(i, await shot(page, i / TL.fps));
      await flush();
    }
  }));
  await flush();
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
}
await browser.close();
server.close();
