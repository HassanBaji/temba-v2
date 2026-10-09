import { Archivo, Geist_Mono, Sora } from "next/font/google";

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
