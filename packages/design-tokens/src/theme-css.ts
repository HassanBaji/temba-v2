import { colors, expanded, hatch, radii, sizes, typeScale } from "./tokens.ts";

function rem(px: number): string {
  return `${Number((px / 16).toFixed(4))}rem`;
}

function block(selector: string, lines: string[]): string {
  return `${selector} {\n${lines.map((line) => `  ${line}`).join("\n")}\n}\n`;
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
  ]);

  const root = block(":root", [
    `--background: ${colors.paper};`,
    `--surface-raised: ${colors.surfaceRaised};`,
    `--card: ${colors.paper};`,
    `--popover: ${colors.paper};`,
    `--muted: ${colors.wash};`,
    `--secondary: ${colors.wash};`,
    `--accent: ${colors.wash};`,
    `--muted-foreground: ${colors.muted};`,
    `--border: ${colors.rule};`,
    `--input: ${colors.inputBorder};`,
    `--primary: ${colors.ink};`,
    `--primary-foreground: ${colors.paper};`,
    `--ring: ${colors.ink};`,
    `--on-ink-muted: ${colors.dim};`,
    `--on-ink-border: ${colors.dimrule};`,
    `--on-ink-raised: ${colors.raised};`,
    `--chart-1: ${colors.ink};`,
    `--sidebar: ${colors.ink};`,
    `--sidebar-foreground: ${colors.paper};`,
    `--sidebar-primary: ${colors.paper};`,
    `--sidebar-primary-foreground: ${colors.ink};`,
    `--sidebar-ring: ${colors.paper};`,
  ]);

  const expandedUtility = block("@utility font-expanded", [
    `font-weight: ${expanded.weight};`,
    `letter-spacing: ${expanded.letterSpacingEm}em;`,
    `font-variation-settings: "wdth" ${expanded.width}, "wght" ${expanded.weight};`,
  ]);

  const hatchUtility = block("@utility hatch", [
    `--hatch-stroke: ${colors.hatchStroke};`,
    "--hatch-inset: var(--color-rule);",
    `background-image: repeating-linear-gradient(${hatch.angle}deg, var(--hatch-stroke) 0 ${hatch.stroke}px, transparent ${hatch.stroke}px ${hatch.period}px);`,
    "box-shadow: inset 0 0 0 1px var(--hatch-inset);",
  ]);

  const hatchOnInkUtility = block("@utility hatch-on-ink", [
    `--hatch-stroke: ${colors.hatchStrokeOnInk};`,
    "--hatch-inset: var(--color-dimrule);",
  ]);

  const header =
    "/* Generated from src/tokens.ts by `pnpm --filter @repo/design-tokens generate`. Do not edit. */\n";

  return [
    header,
    staticTheme,
    inlineTheme,
    root,
    expandedUtility,
    hatchUtility,
    hatchOnInkUtility,
  ].join("\n");
}
