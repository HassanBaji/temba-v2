import baseConfig from "@repo/eslint-config/base";
import clientBoundary from "@repo/eslint-config/client-boundary";
import tseslint from "typescript-eslint";

const SOURCE = ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"];

const HEX_COLOR = "#[0-9a-fA-F]{3,8}\\b";
const FUNCTIONAL_COLOR = "^(rgb|rgba|hsl|hsla)\\(";
const CLASS_SHADOW = "(^|\\s)(shadow|drop-shadow|elevation)(-|\\s|$)";
const CLASS_FONT =
  "(^|\\s)font-(archivo|geist|mono|sans|serif|thin|light|normal|medium|semibold|bold|extrabold|black|expanded)";

const noShadow = [
  {
    selector: "Property[key.name=/^(shadow|textShadow)/]",
    message: "No shadows. Use a hairline border (spec 4.3).",
  },
  {
    selector: "Property[key.value=/^(shadow|textShadow)/]",
    message: "No shadows. Use a hairline border (spec 4.3).",
  },
  {
    selector: "Property[key.name='elevation']",
    message: "No elevation. Use a hairline border (spec 4.3).",
  },
  {
    selector: `JSXAttribute[name.name='className'] Literal[value=/${CLASS_SHADOW}/]`,
    message: "No shadows. Use a hairline border (spec 4.3).",
  },
];

const noRawColor = [
  {
    selector: `Literal[value=/^${HEX_COLOR}$/]`,
    message: "No hex colors in screens. Import from @repo/design-tokens.",
  },
  {
    selector: `JSXAttribute[name.name='className'] Literal[value=/${HEX_COLOR}/]`,
    message: "No hex colors in screens. Import from @repo/design-tokens.",
  },
  {
    selector: `TemplateElement[value.raw=/${HEX_COLOR}/]`,
    message: "No hex colors in screens. Import from @repo/design-tokens.",
  },
  {
    selector: `Literal[value=/${FUNCTIONAL_COLOR}/]`,
    message: "No raw colors in screens. Import from @repo/design-tokens.",
  },
];

const noDirectFont = [
  {
    selector: "Property[key.name=/^(fontFamily|fontWeight)$/]",
    message: "Set type through the Text primitive (weight and width props).",
  },
  {
    selector: "Property[key.value=/^(fontFamily|fontWeight)$/]",
    message: "Set type through the Text primitive (weight and width props).",
  },
  {
    selector: `JSXAttribute[name.name='className'] Literal[value=/${CLASS_FONT}/]`,
    message: "Set type through the Text primitive (weight and width props).",
  },
];

const noMountProps = [
  {
    selector: "JSXAttribute[name.name=/^(entering|exiting|layout)$/]",
    message:
      "Mount animations live in MountFill and MountDraw only (spec 4.5).",
  },
];

function restrict(...groups) {
  return [
    "error",
    ...groups.flat().map(({ selector, message }) => ({ selector, message })),
  ];
}

export default [
  { ignores: ["dist/**", ".expo/**", "*.config.js", "scripts/**"] },
  ...baseConfig,
  ...clientBoundary(SOURCE),
  ...tseslint.config({
    files: SOURCE,
    rules: {
      "no-restricted-syntax": restrict(
        noShadow,
        noRawColor,
        noDirectFont,
        noMountProps,
      ),
    },
  }),
  ...tseslint.config({
    files: ["src/primitives/text.tsx", "src/primitives/text-field.tsx"],
    rules: {
      "no-restricted-syntax": restrict(noShadow, noRawColor, noMountProps),
    },
  }),
  ...tseslint.config({
    files: ["src/primitives/mount-fill.tsx", "src/primitives/mount-draw.tsx"],
    rules: {
      "no-restricted-syntax": restrict(noShadow, noRawColor, noDirectFont),
    },
  }),
];
