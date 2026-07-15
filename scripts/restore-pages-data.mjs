import { readdir, readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const partsDirectory = new URL("../pages-payload/guide-content/", import.meta.url);
const output = new URL("../data/guide-content.json", import.meta.url);
const parts = (await readdir(partsDirectory)).filter((name) => name.endsWith(".b64")).sort();

if (!parts.length) throw new Error("Guide payload parts are missing");

const encoded = (await Promise.all(parts.map((name) => readFile(new URL(name, partsDirectory), "utf8")))).join("");
await writeFile(output, gunzipSync(Buffer.from(encoded, "base64")));
console.log(`Restored guide data from ${parts.length} compressed parts.`);
