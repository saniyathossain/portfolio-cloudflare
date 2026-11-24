/**
 * Tiny static file server WITH gzip, for fair performance comparisons: Python's http.server sends everything
 * uncompressed, which exaggerates the cost of larger HTML (the Cloudflare edge compresses text responses).
 *   node scripts/serve-static.mjs <directory> <port>
 */
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createGzip } from "node:zlib";

const [rootDirectory, portText] = process.argv.slice(2);
const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json", ".xml": "application/xml", ".txt": "text/plain",
};
const COMPRESSIBLE = new Set([".html", ".css", ".js", ".json", ".svg", ".webmanifest", ".xml", ".txt"]);

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://x").pathname);
  let filePath = normalize(join(rootDirectory, pathname));
  if (!filePath.startsWith(normalize(rootDirectory))) return response.writeHead(403).end();
  try {
    if (statSync(filePath).isDirectory()) filePath = join(filePath, "index.html");
    statSync(filePath);
  } catch {
    return response.writeHead(404).end("not found");
  }
  const extension = extname(filePath);
  const headers = { "Content-Type": MIME[extension] ?? "application/octet-stream", "Cache-Control": "max-age=3600" };
  const wantsGzip = /\bgzip\b/.test(request.headers["accept-encoding"] ?? "") && COMPRESSIBLE.has(extension);
  if (!wantsGzip) return createReadStream(filePath).pipe(response.writeHead(200, headers));
  response.writeHead(200, { ...headers, "Content-Encoding": "gzip", Vary: "Accept-Encoding" });
  createReadStream(filePath).pipe(createGzip()).pipe(response);
}).listen(Number(portText), "127.0.0.1");
