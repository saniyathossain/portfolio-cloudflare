import type { Database } from "../types";

/** One ORM handle per D1 binding object for the life of the isolate: building it per request would be wasted work. */
const handles = new WeakMap<object, Database>();

function isD1Binding(candidate: unknown): candidate is object {
  return typeof candidate === "object" && candidate !== null && "prepare" in candidate && "batch" in candidate;
}

/**
 * `undefined` (a no-op connection) when the binding is missing or is not a D1 database. The ORM is imported on first
 * use, so requests that never touch the database (every static page) neither load nor evaluate it.
 */
export async function connectD1(binding: unknown): Promise<Database | undefined> {
  if (!isD1Binding(binding)) return undefined;
  let handle = handles.get(binding);
  if (!handle) {
    const { drizzle } = await import("drizzle-orm/d1");
    handle = drizzle(binding);
    handles.set(binding, handle);
  }
  return handle;
}
