import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "site");
const pagesBase = "/hots_tank.github.io";
const ignoredHtmlPath = `${path.sep}asset-library${path.sep}assets${path.sep}card_studio${path.sep}`;
const imageExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function decodeReference(value) {
  const decodedEntities = value
    .replaceAll("&amp;", "&")
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"');

  try {
    return decodeURI(decodedEntities);
  } catch {
    return decodedEntities;
  }
}

function localTarget(sourceFile, rawReference) {
  let reference = decodeReference(rawReference).trim();

  if (
    !reference ||
    reference.startsWith("#") ||
    /^(?:https?:|mailto:|tel:|data:|blob:|javascript:|about:|\/\/)/i.test(reference)
  ) {
    return null;
  }

  reference = reference.split("#", 1)[0].split("?", 1)[0];
  if (!reference) return null;

  if (reference === pagesBase) return path.join(root, "index.html");
  if (reference.startsWith(`${pagesBase}/`)) {
    return path.join(root, reference.slice(pagesBase.length + 1));
  }
  if (reference.startsWith("/")) return path.join(root, reference.slice(1));
  return path.resolve(path.dirname(sourceFile), reference);
}

const allFiles = walk(root);
const htmlFiles = allFiles.filter(
  (file) => /\.html?$/i.test(file) && !file.includes(ignoredHtmlPath),
);
const broken = [];
let checkedReferences = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const references = [];

  for (const match of html.matchAll(/\b(?:src|href|poster|data|action)\s*=\s*["']([^"']+)["']/gi)) {
    references.push(match[1]);
  }
  for (const match of html.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
    for (const candidate of match[1].split(",")) {
      references.push(candidate.trim().split(/\s+/, 1)[0]);
    }
  }
  for (const match of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    references.push(match[1]);
  }

  for (const reference of references) {
    const target = localTarget(file, reference);
    if (!target) continue;
    checkedReferences += 1;

    const candidates = [target, `${target}.html`, path.join(target, "index.html")];
    const insideRoot = candidates.every(
      (candidate) => candidate === root || candidate.startsWith(`${root}${path.sep}`),
    );
    const exists = insideRoot && candidates.some((candidate) => fs.existsSync(candidate));

    if (!exists) {
      broken.push(`${path.relative(root, file)} -> ${reference}`);
    }
  }
}

const emptyImages = allFiles.filter(
  (file) => imageExtensions.has(path.extname(file).toLowerCase()) && fs.statSync(file).size === 0,
);

if (broken.length || emptyImages.length) {
  if (broken.length) {
    console.error(`Broken local references (${broken.length}):`);
    console.error(broken.join("\n"));
  }
  if (emptyImages.length) {
    console.error(`Empty image files (${emptyImages.length}):`);
    console.error(emptyImages.map((file) => path.relative(root, file)).join("\n"));
  }
  process.exit(1);
}

console.log(
  `Verified ${checkedReferences} local references across ${htmlFiles.length} user-facing HTML files; no empty images found.`,
);
