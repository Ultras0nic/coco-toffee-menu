import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const publicFiles = ["index.html", "styles.css", "app.js", "menu-data.js"];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of publicFiles) {
  await cp(resolve(root, file), resolve(dist, file));
}

await cp(resolve(root, "assets"), resolve(dist, "assets"), { recursive: true });
await writeFile(resolve(dist, ".nojekyll"), "");

console.log(`Built ${publicFiles.length} site files and public assets in dist/.`);
