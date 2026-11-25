import preact from "@astrojs/preact";
import { defineConfig } from "astro/config";

// Phase 2 (docs/aidlc/53): Astro only wraps the existing page. Output stays byte-for-byte what the
// legacy pipeline produced, so nothing is minified or re-formatted here.
export default defineConfig({
  output: "static",
  integrations: [preact()],
  compressHTML: false,
  devToolbar: { enabled: false },
  build: { inlineStylesheets: "never" },
});
