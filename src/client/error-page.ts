/**
 * Outage page enhancement (404 / 500 / 502 / 503 / offline): the request path, the live network service and the
 * self-healing retry countdown (exponential backoff with jitter). Bundled by scripts/build-client.ts into
 * src/generated/error-page.min.js and inlined into each page by ErrorTerminal.astro, so an outage page never needs a
 * second request. Optional by design: the static markup is already complete, and nothing here may throw.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 */
import { prefersReducedMotion } from "../lib/browser/reducedMotion";

interface RetryConfig {
  readonly baseDelayMs: number;
  readonly factor: number;
  readonly maxDelayMs: number;
  readonly maxAttempts: number;
  readonly jitterRatio: number;
  readonly tickMs: number;
}

interface RetryCopy {
  readonly attemptLabel: string;
  readonly waitingLabel: string;
  readonly secondsSuffix: string;
  readonly exhausted: string;
  readonly reconnected: string;
  readonly reloadWhenOnline: boolean;
}

type ServiceStateLabels = Readonly<Record<string, string>>;

const MIN_DELAY_MS = 250;
const MS_PER_SECOND = 1000;
const STALE_ATTEMPTS_MS = 10 * 60 * 1000;
const PERCENT = 100;
const FADE_FROM_OPACITY = 0.55;
const FADE_MS = 320;
const ONLINE_STATE = "ok";
const OFFLINE_STATE = "down";

/** Attempts made so far for this path, kept in sessionStorage so a reload continues the backoff. */
class RetryStore {
  private readonly key = `retry:${location.pathname}`;

  read(): number {
    try {
      const [count, savedAt] = (sessionStorage.getItem(this.key) ?? "").split("|");
      const isStale = Date.now() - Number(savedAt ?? 0) > STALE_ATTEMPTS_MS;
      return isStale ? 0 : Number(count) || 0;
    } catch {
      return 0;
    }
  }

  write(attempts: number): void {
    try {
      sessionStorage.setItem(this.key, `${attempts}|${Date.now()}`);
    } catch {
      /* storage blocked: the countdown still works, it just restarts at the first delay */
    }
  }

  clear(): void {
    try {
      sessionStorage.removeItem(this.key);
    } catch {
      /* nothing to clear */
    }
  }
}

function readJsonAttribute(element: Element, name: string): unknown {
  return JSON.parse(element.getAttribute(name) ?? "null");
}

function showRequestPath(): void {
  const pathElement = document.querySelector("[data-well-path]");
  const requestLine = document.querySelector<HTMLElement>("[data-well-request]");
  if (!pathElement || !requestLine) return;
  pathElement.textContent = location.pathname + location.search;
  requestLine.hidden = false;
}

/** Services marked live="network" follow the browser's connectivity (the build-time state is the fallback). */
function followNetworkService(): void {
  const list = document.querySelector("[data-service-labels]");
  const line = document.querySelector('[data-service-live="network"]');
  if (!list || !line) return;
  const labels = readJsonAttribute(list, "data-service-labels") as ServiceStateLabels;
  const sync = (): void => {
    const state = navigator.onLine ? ONLINE_STATE : OFFLINE_STATE;
    line.setAttribute("data-service-state", state);
    const text = line.querySelector("[data-service-text]");
    if (text) text.textContent = labels[state] ?? state;
  };
  window.addEventListener("online", sync);
  window.addEventListener("offline", sync);
  sync();
}

function bindReloadButton(store: RetryStore): void {
  document.querySelector("[data-reload]")?.addEventListener("click", () => {
    store.clear();
    location.reload();
  });
}

/** The orb: a bare glyph (status code / seconds) plus its draining ring. */
class Orb {
  private readonly root = document.querySelector<HTMLElement>("[data-orb]");
  private readonly value = document.querySelector<HTMLElement>("[data-orb-value]");
  private readonly progress = document.querySelector<SVGElement>("[data-orb-progress]");

  setValue(text: string): void {
    if (this.value?.firstChild) this.value.firstChild.nodeValue = text;
  }

  /** The ring drains through one CSS animation (no per-frame JS); reduced motion gets stepped updates instead. */
  startDraining(totalMs: number, isReducedMotion: boolean): void {
    if (this.root && this.progress && !isReducedMotion) this.root.style.setProperty("--orb-drain-ms", `${totalMs}ms`);
  }

  stepProgress(fractionLeft: number): void {
    if (this.progress) this.progress.style.strokeDashoffset = String((1 - fractionLeft) * PERCENT);
  }

  pulse(): void {
    // Element.animate is missing on very old browsers; the page works without the pulse.
    if (typeof this.value?.animate === "function") {
      this.value.animate([{ opacity: FADE_FROM_OPACITY }, { opacity: 1 }], { duration: FADE_MS, easing: "ease-out" });
    }
  }

  pauseDraining(isPaused: boolean): void {
    if (this.progress) this.progress.style.animationPlayState = isPaused ? "paused" : "running";
  }

  markOnline(): void {
    this.root?.classList.add("is-online");
  }

  /** Gave up retrying: back to the idle glyph, no unit label, no draining ring. */
  showIdle(): void {
    this.root?.classList.remove("is-counting");
    if (!this.value) return;
    this.setValue(this.value.getAttribute("data-orb-idle") ?? "!");
    this.value.querySelector("small")?.remove();
  }
}

/** delay = min(max, base × factor^attempt), spread by ±jitter so visitors do not retry in lock-step. */
function nextDelayMs(config: RetryConfig, attempt: number): number {
  const exponential = Math.min(config.maxDelayMs, config.baseDelayMs * config.factor ** attempt);
  const spread = 1 + (Math.random() * 2 - 1) * config.jitterRatio;
  return Math.max(MIN_DELAY_MS, Math.round(exponential * spread));
}

function startRetry(store: RetryStore): void {
  const line = document.querySelector<HTMLElement>("[data-retry]");
  const textElement = line?.querySelector("[data-retry-text]");
  if (!line || !textElement) return;
  const config = readJsonAttribute(line, "data-retry") as RetryConfig;
  const copy = readJsonAttribute(line, "data-retry-copy") as RetryCopy;
  const orb = new Orb();
  const attempt = store.read();

  if (copy.reloadWhenOnline) {
    window.addEventListener("online", () => {
      line.hidden = false;
      textElement.textContent = copy.reconnected;
      orb.markOnline();
      location.reload();
    });
  }

  if (attempt >= config.maxAttempts) {
    line.hidden = false;
    textElement.textContent = copy.exhausted.replace("{attempts}", String(attempt));
    orb.showIdle();
    return;
  }

  const totalMs = nextDelayMs(config, attempt);
  const isReducedMotion = prefersReducedMotion();
  const announcement = document.querySelector("[data-retry-sr]");
  if (announcement) {
    const template = announcement.getAttribute("data-retry-sr-template") ?? "";
    announcement.textContent = template.replace("{seconds}", String(Math.round(totalMs / MS_PER_SECOND)));
  }
  orb.startDraining(totalMs, isReducedMotion);

  let remainingMs = totalMs;
  let lastTick = Date.now();
  let shownSeconds = -1;
  const draw = (): void => {
    const seconds = Math.max(0, Math.ceil(remainingMs / MS_PER_SECOND));
    if (isReducedMotion) orb.stepProgress(remainingMs / totalMs);
    if (seconds === shownSeconds) return; // the DOM only changes once per displayed second
    shownSeconds = seconds;
    textElement.textContent = `${copy.attemptLabel} ${attempt + 1}/${config.maxAttempts} · ${copy.waitingLabel} ${seconds}${copy.secondsSuffix}`;
    orb.setValue(String(seconds));
    if (!isReducedMotion) orb.pulse();
  };

  line.hidden = false;
  draw();
  // The countdown (and the ring animation) pauses while the tab is hidden, so both stay in sync.
  document.addEventListener("visibilitychange", () => {
    orb.pauseDraining(document.hidden);
  });
  const timer = window.setInterval(() => {
    const now = Date.now();
    if (!document.hidden) remainingMs -= now - lastTick;
    lastTick = now;
    if (remainingMs <= 0) {
      window.clearInterval(timer);
      store.write(attempt + 1);
      location.reload();
      return;
    }
    draw();
  }, config.tickMs);
}

try {
  const store = new RetryStore();
  showRequestPath();
  followNetworkService();
  bindReloadButton(store);
  startRetry(store);
} catch {
  /* the static page is already complete */
}
