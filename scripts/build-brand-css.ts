/**
 * Generates public/assets/css/brands.css (every brand pill tint as a `.bc-<hex>{--brand:#hex}` class) and
 * brands.critical.css (the hero partner colours only, appended to the inlined critical CSS by minify-css.ts).
 * The class names come from the same BrandResolver the pages use, bundled here with esbuild so the TypeScript
 * sources run unchanged. Replaces the per-element `style="--brand:…"` attributes.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { logDone } from "./lib/console.ts";

const ROOT = join(import.meta.dirname, "..");
const CSS_DIR = join(ROOT, "public/assets/css");

const bundle = await build({
  entryPoints: [join(ROOT, "src/bootstrap/brandCss.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  logLevel: "silent",
});
const source = bundle.outputFiles[0]?.text ?? "";
const loaded = (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)) as {
  buildBrandCss: () => { all: string; critical: string };
};
const { all, critical } = loaded.buildBrandCss();
writeFileSync(join(CSS_DIR, "brands.css"), all);
writeFileSync(join(CSS_DIR, "brands.critical.css"), critical);
logDone(`build-brand-css: ${all.split("\n").length - 1} brand classes (${critical.split("\n").length - 1} critical)`);
