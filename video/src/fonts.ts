import { continueRender, delayRender } from "remotion";

import archivo from "@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2";
import archivoExt from "@fontsource-variable/archivo/files/archivo-latin-ext-wdth-normal.woff2";
import plex400 from "@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff2";
import plex500 from "@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-500-normal.woff2";
import plex600 from "@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-600-normal.woff2";
import plex700 from "@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-700-normal.woff2";
import sora300 from "@fontsource/sora/files/sora-latin-300-normal.woff2";
import sora400 from "@fontsource/sora/files/sora-latin-400-normal.woff2";

const ARABIC_RANGE =
  "U+0600-06FF, U+0750-077F, U+0870-089F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFF";

const faces: FontFace[] = [
  new FontFace("Archivo", `url(${archivo}) format("woff2")`, {
    weight: "100 900",
    stretch: "62% 125%",
  }),
  new FontFace("Archivo", `url(${archivoExt}) format("woff2")`, {
    weight: "100 900",
    stretch: "62% 125%",
    unicodeRange: "U+0100-02BA, U+2013, U+2020, U+20A0-20C0",
  }),
  ...(
    [
      [plex400, "400"],
      [plex500, "500"],
      [plex600, "600"],
      [plex700, "700"],
    ] as const
  ).map(
    ([src, weight]) =>
      new FontFace("Plex Arabic", `url(${src}) format("woff2")`, {
        weight,
        unicodeRange: ARABIC_RANGE,
      }),
  ),
  new FontFace("Sora", `url(${sora300}) format("woff2")`, { weight: "300" }),
  new FontFace("Sora", `url(${sora400}) format("woff2")`, { weight: "400" }),
];

let loaded = false;

export function loadFonts() {
  if (loaded) return;
  loaded = true;
  const handle = delayRender("Loading fonts");
  Promise.all(
    faces.map((face) => {
      document.fonts.add(face);
      return face.load();
    }),
  )
    .then(() => document.fonts.ready)
    .then(() => continueRender(handle))
    .catch((error) => {
      console.error(error);
      continueRender(handle);
    });
}
