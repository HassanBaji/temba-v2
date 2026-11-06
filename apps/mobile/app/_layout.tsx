import "../global.css";

import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { Providers } from "../src/providers";
import { useColorSchemeName } from "../src/theme/theme-provider";

function SchemeStatusBar() {
  return (
    <StatusBar style={useColorSchemeName() === "dark" ? "light" : "dark"} />
  );
}

export default function RootLayout() {
  return (
    <Providers>
      <SchemeStatusBar />
      <Slot />
    </Providers>
  );
}
