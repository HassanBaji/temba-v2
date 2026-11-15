import { Archivo, Geist_Mono, Noto_Sans_Arabic, Sora } from "next/font/google";

export const sans = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-sans",
});

export const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

/** Sora for the TEMBA wordmark only — do not apply as `font-sans`. */
export const display = Sora({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-display",
});

/**
 * Archivo has no Arabic glyphs. Noto Sans Arabic sits after it in the
 * `font-sans` stack so Arabic text falls through to it while digits and
 * Latin stay in Archivo (`intlLocale` keeps Latin digits).
 */
export const arabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  axes: ["wdth"],
  variable: "--font-arabic",
});
