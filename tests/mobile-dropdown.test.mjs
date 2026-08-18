import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("provider menu stays inside a narrow mobile viewport", async () => {
  const css = await readFile(
    new URL("../ru/ipv4-whitelisted-subnets/style.css", import.meta.url),
    "utf8",
  );

  const mobileStart = css.indexOf("@media (max-width: 600px)");
  assert.notEqual(mobileStart, -1, "mobile stylesheet must exist");
  const mobile = css.slice(mobileStart);
  assert.match(mobile, /\.providers-menu\s*\{[\s\S]*?left:\s*0;/);
  assert.match(mobile, /\.providers-menu\s*\{[\s\S]*?right:\s*auto;/);
  assert.match(
    mobile,
    /\.providers-menu\s*\{[\s\S]*?width:\s*min\(18em, calc\(100vw - 20px\)\);/,
  );
});
