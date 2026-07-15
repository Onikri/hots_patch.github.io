import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const source = process.env.PAGES_ASSET_SOURCE ?? "https://tank-field-guide.onikri.chatgpt.site";
const output = new URL("../out/", import.meta.url);
const visuals = JSON.parse(await readFile(new URL("../data/hero-visuals.json", import.meta.url), "utf8"));
const heroSlugs = ["anubarak", "arthas", "johanna", "diablo", "blaze", "garrosh", "etc", "malganis", "mei", "muradin", "stitches", "tyrael", "varian"];
const draftSlugs = ["balanced", "burst", "dive", "late", "macro", "pickoff", "poke", "rotation", "wombo", "zoning"];
const paths = new Set(["/favicon.svg"]);

for (const slug of heroSlugs) {
  paths.add(`/heroes/${slug}-profile.jpg`);
  paths.add(`/heroes/${slug}-thumb.jpg`);
}
for (const slug of draftSlugs) paths.add(`/guide/drafts/${slug}.jpg`);
for (const groups of Object.values(visuals)) {
  for (const items of Object.values(groups)) {
    for (const item of items) {
      paths.add(item.src);
      paths.add(item.thumb);
    }
  }
}

const queue = [...paths];
let completed = 0;

async function download(path) {
  const response = await fetch(`${source}${path}`);
  if (!response.ok) throw new Error(`${response.status} while downloading ${path}`);
  const target = join(output.pathname, path.slice(1));
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
  completed += 1;
}

async function worker() {
  while (queue.length) await download(queue.shift());
}

await Promise.all(Array.from({ length: 12 }, worker));
await writeFile(new URL(".nojekyll", output), "");
console.log(`Downloaded ${completed} optimized image assets for GitHub Pages.`);
