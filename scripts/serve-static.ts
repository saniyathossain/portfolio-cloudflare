/**
 * Tiny static file server WITH gzip, for fair performance comparisons: Python's http.server sends everything
 * uncompressed, which exaggerates the cost of larger HTML (the Cloudflare edge compresses text responses).
 *   node scripts/serve-static.ts <directory> <port>
 */
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { createGzip } from "node:zlib";

const LISTEN_HOST = "127.0.0.1";
const CACHE_CONTROL = "max-age=3600";
const DEFAULT_MIME_TYPE = "application/octet-stream";
const URL_PARSE_BASE = "http://x";

const MIME_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json", ".xml": "application/xml", ".txt": "text/plain",
};
const COMPRESSIBLE_EXTENSIONS: ReadonlySet<string> = new Set([
  ".html", ".css", ".js", ".json", ".svg", ".webmanifest", ".xml", ".txt",
]);

const [rootDirectory, portText] = process.argv.slice(2);
if (rootDirectory === undefined || portText === undefined) {
  console.error("usage: node scripts/serve-static.ts <directory> <port>");
  process.exit(1);
}

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? "/", URL_PARSE_BASE).pathname);
  let filePath = normalize(join(rootDirectory, pathname));
  if (!filePath.startsWith(normalize(rootDirectory))) {
    response.writeHead(403).end();
    return;
  }
  try {
    if (statSync(filePath).isDirectory()) filePath = join(filePath, "index.html");
    statSync(filePath);
  } catch {
    response.writeHead(404).end("not found");
    return;
  }
  const extension = extname(filePath);
  const headers = { "Content-Type": MIME_TYPES[extension] ?? DEFAULT_MIME_TYPE, "Cache-Control": CACHE_CONTROL };
  const acceptEncoding = request.headers["accept-encoding"] ?? "";
  const wantsGzip = /\bgzip\b/.test(acceptEncoding) && COMPRESSIBLE_EXTENSIONS.has(extension);
  if (!wantsGzip) {
    response.writeHead(200, headers);
    createReadStream(filePath).pipe(response);
    return;
  }
  response.writeHead(200, { ...headers, "Content-Encoding": "gzip", Vary: "Accept-Encoding" });
  createReadStream(filePath).pipe(createGzip()).pipe(response);
}).listen(Number(portText), LISTEN_HOST);
