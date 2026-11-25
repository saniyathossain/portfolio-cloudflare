/** Deterministic content hash over public/ — shared by hash-sw.ts (service worker cache version)
 *  and set-asset-version.ts (?v= query-string cache-busting). Each caller passes its own `exclude`
 *  set: files that hold a *copy* of the hash's own output must be excluded, or the hash would never
 *  converge (run 1 writes hash A into the file, run 2 hashes that file's new content and gets hash
 *  B, forever, defeating "clean build = no diff").
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const PUBLIC = join(import.meta.dirname, "..", "..", "public");

const HASH_ALGORITHM = "sha256";
const HASH_LENGTH = 12;
const SOURCE_MAP_SUFFIX = ".map";

function toPosixPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function collectFiles(directory: string, skippedPaths: ReadonlySet<string>, collected: string[]): string[] {
  for (const name of readdirSync(directory).sort()) {
    const fullPath = join(directory, name);
    const relativePath = toPosixPath(relative(PUBLIC, fullPath));
    if (statSync(fullPath).isDirectory()) collectFiles(fullPath, skippedPaths, collected);
    else if (!skippedPaths.has(relativePath) && !fullPath.endsWith(SOURCE_MAP_SUFFIX)) collected.push(fullPath);
  }
  return collected;
}

export function computeHash(exclude: readonly string[]): string {
  const files = collectFiles(PUBLIC, new Set(exclude), []);
  const hash = createHash(HASH_ALGORITHM);
  for (const file of files) {
    hash.update(toPosixPath(relative(PUBLIC, file)));
    hash.update(readFileSync(file));
  }
  return hash.digest("hex").slice(0, HASH_LENGTH);
}
