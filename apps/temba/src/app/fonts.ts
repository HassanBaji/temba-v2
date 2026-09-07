import { Archivo, Geist_Mono } from "next/font/google";

export const sans = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-sans",
});

export const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
