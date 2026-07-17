import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const siteRoot = resolve(process.argv[2] || "site");
const port = Number(process.env.TANK_PREVIEW_PORT || 4173);
const prefix = "/hots_tank.github.io";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function fileCandidate(pathname) {
  let relative = decodeURIComponent(pathname.split("?")[0]);
  if (relative.startsWith(prefix)) relative = relative.slice(prefix.length);
  relative = relative.replace(/^\/+/, "");
  const candidates = [];
  if (!relative) candidates.push("index.html");
  else {
    candidates.push(relative);
    if (!extname(relative)) {
      candidates.push(relative + ".html");
      candidates.push(relative + "/index.html");
    }
  }

  for (const candidate of candidates) {
    const absolute = resolve(siteRoot, candidate);
    if (absolute !== siteRoot && !absolute.startsWith(siteRoot + sep)) continue;
    try {
      const stats = statSync(absolute);
      if (stats.isFile()) return { absolute, stats };
      if (stats.isDirectory()) {
        const index = resolve(absolute, "index.html");
        const indexStats = statSync(index);
        if (indexStats.isFile()) return { absolute: index, stats: indexStats };
      }
    } catch (_error) {
      continue;
    }
  }
  return null;
}

createServer((request, response) => {
  const match = fileCandidate(request.url || "/");
  if (!match) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  response.writeHead(200, {
    "cache-control": "no-store",
    "content-length": match.stats.size,
    "content-type": contentTypes[extname(match.absolute).toLowerCase()] || "application/octet-stream",
  });
  if (request.method === "HEAD") response.end();
  else createReadStream(match.absolute).pipe(response);
}).listen(port, "127.0.0.1", () => {
  process.stdout.write("Preview: http://127.0.0.1:" + port + prefix + "/\n");
});
