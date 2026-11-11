import {
  darkColors,
  colors,
  expanded,
  hatch,
  radii,
  sizes,
  typeScale,
  type ColorScheme,
  type Palette,
} from "./tokens.ts";

function rem(px: number): string {
  return `${Number((px / 16).toFixed(4))}rem`;
}

function block(selector: string, lines: string[]): string {
  return `${selector} {\n${lines.map((line) => `  ${line}`).join("\n")}\n}\n`;
}

function schemeLines(palette: Palette, scheme: ColorScheme): string[] {
  return [
    `color-scheme: ${scheme};`,
    `--background: ${palette.paper};`,
    `--surface-raised: ${palette.surfaceRaised};`,
    `--card: ${palette.paper};`,
    `--popover: ${palette.sheet};`,
    `--muted: ${palette.wash};`,
    `--secondary: ${palette.wash};`,
    `--accent: ${palette.wash};`,
    `--muted-foreground: ${palette.muted};`,
    `--border: ${palette.rule};`,
    `--input: ${palette.inputBorder};`,
    `--primary: ${palette.ink};`,
    `--primary-foreground: ${palette.paper};`,
    `--ring: ${palette.ink};`,
    `--on-ink-muted: ${palette.dim};`,
    `--on-ink-border: ${palette.dimrule};`,
    `--on-ink-raised: ${palette.raised};`,
    `--focus: ${palette.focus};`,
    `--on-focus: ${palette.onFocus};`,
    `--control: ${palette.control};`,
    `--on-control: ${palette.onControl};`,
    `--control-edge: ${palette.controlEdge};`,
    `--focus-control: ${palette.focusControl};`,
    `--on-focus-control: ${palette.onFocusControl};`,
    `--lifted: ${palette.lifted};`,
    `--lifted-control: ${palette.liftedControl};`,
    `--sheet: ${palette.sheet};`,
    `--scrim: ${palette.scrim};`,
    `--hatch-stroke-paper: ${palette.hatchStroke};`,
    `--hatch-stroke-ink: ${palette.hatchStrokeOnInk};`,
    `--chart-1: ${palette.ink};`,
    `--sidebar: ${palette.focus};`,
    `--sidebar-foreground: ${palette.onFocus};`,
    `--sidebar-primary: ${scheme === "light" ? palette.paper : palette.control};`,
    `--sidebar-primary-foreground: ${scheme === "light" ? palette.ink : palette.onControl};`,
    `--sidebar-ring: ${palette.onFocus};`,
  ];
}

export function renderThemeCss(): string {
  const typeLines = Object.entries(typeScale).flatMap(([name, t]) => {
    const key = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    return [
      `--text-${key}: ${rem(t.size)};`,
      `--text-${key}--line-height: ${rem(t.lineHeight)};`,
    ];
  });

  const staticTheme = block("@theme static", [
    ...typeLines,
    `--container-content: ${rem(sizes.contentWidth)};`,
    `--container-wide: ${rem(sizes.wideWidth)};`,
    `--container-column: ${rem(sizes.columnWidth)};`,
    `--rail-width: ${rem(sizes.railWidth)};`,
    `--bottom-nav-height: ${rem(sizes.bottomTabs)};`,
    `--mobile-top-bar-height: ${rem(sizes.topBar)};`,
    `--radius: ${rem(radii.lg)};`,
  ]);

  const inlineTheme = block("@theme inline", [
    `--radius-xs: ${radii.slot}px;`,
    `--radius-card: ${radii.card}px;`,
    "--color-ink: var(--primary);",
    "--color-paper: var(--card);",
    "--color-rule: var(--border);",
    "--color-wash: var(--muted);",
    "--color-dim: var(--on-ink-muted);",
    "--color-dimrule: var(--on-ink-border);",
    "--color-raised: var(--on-ink-raised);",
    "--color-focus: var(--focus);",
    "--color-on-focus: var(--on-focus);",
    "--color-control: var(--control);",
    "--color-on-control: var(--on-control);",
    "--color-control-edge: var(--control-edge);",
    "--color-focus-control: var(--focus-control);",
    "--color-on-focus-control: var(--on-focus-control);",
    "--color-lifted: var(--lifted);",
    "--color-lifted-control: var(--lifted-control);",
    "--color-sheet: var(--sheet);",
    "--color-scrim: var(--scrim);",
  ]);

  const light = block(":root, .light", schemeLines(colors, "light"));
  const dark = block(".dark", schemeLines(darkColors, "dark"));

  const expandedUtility = block("@utility font-expanded", [
    `font-weight: ${expanded.weight};`,
    `letter-spacing: ${expanded.letterSpacingEm}em;`,
    `font-variation-settings: "wdth" ${expanded.width}, "wght" ${expanded.weight};`,
  ]);

  const hatchUtility = block("@utility hatch", [
    "--hatch-stroke: var(--hatch-stroke-paper);",
    "--hatch-inset: var(--color-rule);",
    `background-image: repeating-linear-gradient(${hatch.angle}deg, var(--hatch-stroke) 0 ${hatch.stroke}px, transparent ${hatch.stroke}px ${hatch.period}px);`,
    "box-shadow: inset 0 0 0 1px var(--hatch-inset);",
  ]);

  const hatchOnInkUtility = block("@utility hatch-on-ink", [
    "--hatch-stroke: var(--hatch-stroke-ink);",
    "--hatch-inset: var(--color-dimrule);",
  ]);

  const header =
    "/* Generated from src/tokens.ts by `pnpm --filter @repo/design-tokens generate`. Do not edit. */\n";

  return [
    header,
    staticTheme,
    inlineTheme,
    light,
    dark,
    expandedUtility,
    hatchUtility,
    hatchOnInkUtility,
  ].join("\n");
}
