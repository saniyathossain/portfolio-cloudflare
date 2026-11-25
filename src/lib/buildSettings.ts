/**
 * Build-time settings that may come from environment variables instead of portfolio.json. They are public identifiers
 * baked into the static HTML, so they are read at build (Cloudflare: Workers Builds → Build variables), not by the
 * Worker at runtime. Plain `as const` object (not an enum): scripts/sync-head.ts imports this file through Node's
 * type stripping, which cannot run enums.
 */
export const BUILD_ENV = {
  googleAnalyticsId: "GOOGLE_ANALYTICS_ID",
  cloudflareAnalyticsToken: "CLOUDFLARE_ANALYTICS_TOKEN",
  turnstileSiteKey: "TURNSTILE_SITE_KEY",
  /** 0..1 share of visitors that send a real-user Web Vitals beacon; 0 / unset = feature off, zero requests. */
  rumSampleRate: "RUM_SAMPLE_RATE",
} as const;

export type BuildEnvironment = Readonly<Record<string, string | undefined>>;

interface OverridableSite {
  readonly turnstileSiteKey: string;
  readonly analytics: { readonly googleId: string; readonly cloudflareToken: string };
}

/** A non-blank environment value wins; otherwise the portfolio.json value stays. */
export function pickSetting(environmentValue: string | undefined, jsonValue: string): string {
  const trimmed = environmentValue?.trim() ?? "";
  return trimmed === "" ? jsonValue : trimmed;
}

/** `site` with the analytics ids and the Turnstile site key replaced by their environment variables when set. */
export function applyBuildEnvironment<TSite extends OverridableSite>(site: TSite, environment: BuildEnvironment): TSite {
  return {
    ...site,
    turnstileSiteKey: pickSetting(environment[BUILD_ENV.turnstileSiteKey], site.turnstileSiteKey),
    analytics: {
      googleId: pickSetting(environment[BUILD_ENV.googleAnalyticsId], site.analytics.googleId),
      cloudflareToken: pickSetting(environment[BUILD_ENV.cloudflareAnalyticsToken], site.analytics.cloudflareToken),
    },
  };
}

const MAX_SAMPLE_RATE = 1;

/** `RUM_SAMPLE_RATE` as a number in [0, 1]; anything unset, blank, negative or not a number means off (0). */
export function readSampleRate(environment: BuildEnvironment): number {
  const parsed = Number.parseFloat(environment[BUILD_ENV.rumSampleRate] ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(parsed, MAX_SAMPLE_RATE);
}
