import { map, type MapStore } from "nanostores";

/** Shell UI state shared by the delegated action module (a separate esbuild bundle) and the Preact islands. */
export interface ShellState {
  readonly menuOpen: boolean;
  readonly modalOpen: boolean;
  /** Sticky, never reverts: lazy-mounts the nav-item list on the menu's first open. */
  readonly menuMounted: boolean;
  /** Sticky, never reverts: lazy-mounts the contact form body on the modal's first open. */
  readonly modalMounted: boolean;
}

export type ShellStore = MapStore<ShellState>;

const INITIAL_STATE: ShellState = { menuOpen: false, modalOpen: false, menuMounted: false, modalMounted: false };

/**
 * The delegated listener bundle (public/assets/js/actions.min.js) and the Astro island bundle each bundle their own
 * copy of this module, so the single store instance is parked on globalThis under a registered symbol.
 */
const STORE_KEY = Symbol.for("portfolio.shellStore");

type StoreHolder = Record<symbol, ShellStore | undefined>;

function createShellStore(): ShellStore {
  const holder = globalThis as unknown as StoreHolder;
  const existing = holder[STORE_KEY];
  if (existing) return existing;
  const created = map<ShellState>({ ...INITIAL_STATE });
  holder[STORE_KEY] = created;
  return created;
}

export const shellStore: ShellStore = createShellStore();
