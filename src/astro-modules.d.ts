/** Plain TypeScript (ESLint's program, tsc) cannot resolve `.astro` imports; `astro check` types them for real. */
declare module "*.astro" {
  import type { AstroComponentFactory } from "astro/runtime/server/index.js";
  const component: AstroComponentFactory;
  export default component;
}
