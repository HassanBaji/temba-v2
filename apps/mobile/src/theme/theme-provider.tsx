import { palettes, type ColorScheme, type Palette } from "@repo/design-tokens";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance as NativeAppearance, useColorScheme } from "react-native";

import {
  DEFAULT_APPEARANCE,
  resolveColorScheme,
  type Appearance,
} from "./appearance";
import { loadAppearance, storeAppearance } from "./appearance-store";

type ThemeContextValue = {
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
  scheme: ColorScheme;
  colors: Palette;
};

const ThemeContext = createContext<ThemeContextValue>({
  appearance: DEFAULT_APPEARANCE,
  setAppearance: () => undefined,
  scheme: "light",
  colors: palettes.light,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearanceState] =
    useState<Appearance>(DEFAULT_APPEARANCE);
  const system = useColorScheme();

  useEffect(() => {
    let cancelled = false;
    void loadAppearance().then((loaded) => {
      if (!cancelled) {
        setAppearanceState(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Native chrome (alerts, keyboards, pickers) follows the override too.
  useEffect(() => {
    NativeAppearance.setColorScheme(
      appearance === "system" ? "unspecified" : appearance,
    );
  }, [appearance]);

  const setAppearance = useCallback((next: Appearance) => {
    setAppearanceState(next);
    void storeAppearance(next);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme = resolveColorScheme(appearance, system);
    return { appearance, setAppearance, scheme, colors: palettes[scheme] };
  }, [appearance, setAppearance, system]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Draws its subtree in light whatever the Appearance: share images leave the
 * App and look the same in both schemes.
 */
export function LightScheme({ children }: { children: React.ReactNode }) {
  const outer = useContext(ThemeContext);
  const value = useMemo<ThemeContextValue>(
    () => ({ ...outer, scheme: "light", colors: palettes.light }),
    [outer],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/** The palette for the scheme on screen. Read colors here, never import them. */
export function useColors(): Palette {
  return useContext(ThemeContext).colors;
}

export function useColorSchemeName(): ColorScheme {
  return useContext(ThemeContext).scheme;
}

export function useAppearance() {
  const { appearance, setAppearance } = useContext(ThemeContext);
  return { appearance, setAppearance };
}
