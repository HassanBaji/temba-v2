import { writeFileSync } from "node:fs";
import { renderThemeCss } from "./theme-css.ts";

writeFileSync(new URL("../theme.css", import.meta.url), renderThemeCss());
