// Renders index.html frame by frame and encodes the MP4 with the music bed.
//
//   node render.cjs                      → out/marks-launch-en.mp4
//   node render.cjs --lang ar            → out/marks-launch-ar.mp4
//   node render.cjs --stills 90,150,300  → out/stills/en-f0090.png …
//
// Needs Playwright with Chromium and ffmpeg on the PATH. Set CHROMIUM_PATH to
// use a specific Chromium build.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const lang = opt("lang", "en");
const stills = opt("stills", null);
const root = __dirname;
const outDir = path.join(root, "out");

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {},
  );
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  const url = pathToFileURL(path.join(root, "index.html"));
  url.search = `render=1&lang=${lang}`;
  await page.goto(url.href);
  await page.evaluate(() => window.__ready);
  const frames = await page.evaluate(() => window.__frames);
  const stage = await page.$("#stage");

  if (stills) {
    const dir = path.join(outDir, "stills");
    fs.mkdirSync(dir, { recursive: true });
    for (const f of stills.split(",").map(Number)) {
      await page.evaluate((n) => window.renderFrame(n), f);
      const file = path.join(dir, `${lang}-f${String(f).padStart(4, "0")}.png`);
      await stage.screenshot({ path: file });
      console.log(file);
    }
    await browser.close();
    return;
  }

  const wav = path.join(root, "music", "music.wav");
  const mp4 = path.join(outDir, `marks-launch-${lang}.mp4`);
  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "image2pipe",
      "-framerate",
      "30",
      "-i",
      "-",
      "-i",
      wav,
      "-map",
      "0:v",
      "-map",
      "1:a",
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "16",
      "-profile:v",
      "high",
      "-pix_fmt",
      "yuv420p",
      "-r",
      "30",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-ar",
      "44100",
      "-t",
      "20",
      "-movflags",
      "+faststart",
      mp4,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const done = new Promise((resolve, reject) => {
    ffmpeg.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)),
    );
  });

  for (let f = 0; f < frames; f++) {
    await page.evaluate((n) => window.renderFrame(n), f);
    const png = await stage.screenshot({ type: "png" });
    if (!ffmpeg.stdin.write(png))
      await new Promise((r) => ffmpeg.stdin.once("drain", r));
    if (f % 30 === 0) process.stdout.write(`\rframe ${f}/${frames}`);
  }
  ffmpeg.stdin.end();
  await done;
  await browser.close();
  console.log(`\n${mp4}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
