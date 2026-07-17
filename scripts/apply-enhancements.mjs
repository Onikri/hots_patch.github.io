import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const siteRoot = path.resolve(process.argv[2] ?? path.join(repositoryRoot, "site"));
const overridesRoot = path.join(repositoryRoot, "overrides");
const cssName = "field-guide-enhancements.css";
const jsName = "field-guide-enhancements.js";
const suiteCssName = "training-suite.css";
const suiteJsName = "training-suite.js";
const cssHref = `/hots_tank.github.io/${cssName}`;
const jsSrc = `/hots_tank.github.io/${jsName}`;
const suiteCssHref = `/hots_tank.github.io/${suiteCssName}`;
const suiteJsSrc = `/hots_tank.github.io/${suiteJsName}`;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

if (!fs.existsSync(siteRoot)) {
  throw new Error(`Site directory does not exist: ${siteRoot}`);
}

for (const fileName of [cssName, jsName, suiteCssName, suiteJsName]) {
  fs.copyFileSync(path.join(overridesRoot, fileName), path.join(siteRoot, fileName));
}

fs.cpSync(
  path.join(overridesRoot, "assets"),
  path.join(siteRoot, "lab", "game-assets"),
  { recursive: true },
);

fs.mkdirSync(path.join(siteRoot, "lab"), { recursive: true });
fs.copyFileSync(
  path.join(overridesRoot, "data", "tank-training-data.json"),
  path.join(siteRoot, "lab", "training-data.json"),
);

const htmlFiles = walk(siteRoot).filter(
  (file) =>
    file.endsWith(".html") &&
    !file.includes(`${path.sep}asset-library${path.sep}`),
);

let changed = 0;
for (const htmlFile of htmlFiles) {
  let html = fs.readFileSync(htmlFile, "utf8");
  const original = html;

  if (!html.includes(cssHref)) {
    html = html.replace(
      "</head>",
      `<link rel="stylesheet" href="${cssHref}" data-field-guide-enhancements="true"/></head>`,
    );
  }

  if (!html.includes(suiteCssHref)) {
    html = html.replace(
      "</head>",
      `<link rel="stylesheet" href="${suiteCssHref}" data-training-suite="true"/></head>`,
    );
  }

  if (!html.includes(jsSrc)) {
    html = html.replace(
      "</body>",
      `<script src="${jsSrc}" defer data-field-guide-enhancements="true"></script></body>`,
    );
  }


  if (!html.includes(suiteJsSrc)) {
    html = html.replace(
      "</body>",
      `<script src="${suiteJsSrc}" defer data-training-suite="true"></script></body>`,
    );
  }

  if (html !== original) {
    fs.writeFileSync(htmlFile, html, "utf8");
    changed += 1;
  }
}

console.log(
  `Installed field-guide enhancements and updated ${changed} of ${htmlFiles.length} user-facing HTML files.`,
);
