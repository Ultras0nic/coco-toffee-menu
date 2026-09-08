import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("browser entry points parse successfully", () => {
  for (const file of ["app.js", "owner.js", "owner-config.js"]) {
    const result = spawnSync(process.execPath, ["--check", fileURLToPath(new URL(file, root))], { encoding: "utf8" });
    assert.equal(result.status, 0, `${file}: ${result.stderr}`);
  }
});

test("public build is allow-listed and includes owner assets without server files", async () => {
  const build = await readFile(new URL("scripts/build.mjs", root), "utf8");
  for (const file of ["owner.html", "owner.css", "owner.js", "owner-config.js"]) assert.ok(build.includes(`"${file}"`));
  assert.doesNotMatch(build, /cp\(resolve\(root, "(?:supabase|pricing)"/);
  const config = await readFile(new URL("owner-config.js", root), "utf8");
  assert.doesNotMatch(config, /(?:sk_live_|sk_test_|sb_secret_|re_[A-Za-z0-9]{20})/);
});

test("unconfigured storefront does not pretend requests were sent", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const app = await readFile(new URL("app.js", root), "utf8");
  assert.match(html, /meta name="order-endpoint" content="[^"]*"/);
  assert.match(html, /meta name="turnstile-site-key" content="[^"]*"/);
  assert.match(app, /Your request has not been sent/);
  assert.match(app, /mailto:jericholi334677@gmail\.com/);
});

test("private setup and secrets are not inside public content folders", async () => {
  const files = await readdir(new URL("data/", root));
  assert.deepEqual(files, ["menu.json"]);
  const menu = await readFile(new URL("data/menu.json", root), "utf8");
  assert.doesNotMatch(menu, /PRIVATE_QUOTE_GUIDE|fullCostCents|private_quote_start|service_role|STRIPE_SECRET/);
});
