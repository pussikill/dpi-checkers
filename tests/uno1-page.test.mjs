import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const expected = [
  ["UNO1.DE-01", "Germany", "de1.uno1.fyi"],
  ["UNO1.FI-01", "Finland", "fi1.uno1.fyi"],
  ["UNO1.SE-01", "Sweden", "se1.uno1.fyi"],
  ["UNO1.RU-01", "Moscow", "msk1.uno1.fyi"],
];

test("UNO1 checker publishes exactly the four owned TLS hostnames", async () => {
  const servers = JSON.parse(
    await readFile(new URL("../uno1/servers.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(
    servers.map(({ id, location, host }) => [id, location, host]),
    expected,
  );
  assert.ok(servers.every(({ host }) => host.endsWith(".uno1.fyi")));
});

test("UNO1 checker is a standalone browser page", async () => {
  const html = await readFile(
    new URL("../uno1/index.html", import.meta.url),
    "utf8",
  );
  assert.match(html, /<script src="main\.js/);
  assert.match(html, /UNO1 Server Checker/);
  assert.doesNotMatch(html, /subscription|uuid|privateKey/i);
});
