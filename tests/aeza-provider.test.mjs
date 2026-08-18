import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  AEZA_PROVIDER,
  parsePrefixSnapshot,
  selectSnapshotPrefixes,
} from "../ru/ipv4-whitelisted-subnets/aeza-source.mjs";

test("AEZA provider uses the exact official geofeed snapshot", async () => {
  const raw = await readFile(
    new URL(
      "../ru/ipv4-whitelisted-subnets/providers/aeza-ipv4.json",
      import.meta.url,
    ),
    "utf8",
  );
  const prefixes = parsePrefixSnapshot(JSON.parse(raw));

  assert.equal(AEZA_PROVIDER.name, "AEZA — all networks");
  assert.equal(AEZA_PROVIDER.prefixSource, "./providers/aeza-ipv4.json");
  assert.ok(prefixes.length > 300);
  assert.equal(new Set(prefixes).size, prefixes.length);
  assert.ok(prefixes.includes("138.124.59.0/24"));
  assert.ok(prefixes.includes("213.21.254.0/24"));
  assert.ok(prefixes.includes("178.236.240.0/24"));

  const only24 = selectSnapshotPrefixes(JSON.parse(raw), true);
  assert.ok(only24.every((prefix) => prefix.endsWith("/24")));
  assert.ok(only24.includes("178.236.240.0/24"));

  const all = selectSnapshotPrefixes(JSON.parse(raw), false);
  assert.ok(all.some((prefix) => !prefix.endsWith("/24")));
});

test("AEZA snapshot rejects malformed or unrelated data", () => {
  assert.throws(() =>
    parsePrefixSnapshot({
      source: "https://example.test/geofeed.csv",
      retrievedAt: "2026-08-18T00:00:00Z",
      prefixes: ["127.0.0.1/32"],
    }),
  );
});

test("IPv4 checker loads AEZA through the shared persistent cache", async () => {
  const [html, main] = await Promise.all([
    readFile(
      new URL("../ru/ipv4-whitelisted-subnets/index.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../ru/ipv4-whitelisted-subnets/main.js", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(
    html,
    /<script type="module" src="main\.js\?v=[^"]+"><\/script>/,
  );
  assert.match(main, /AEZA_PROVIDER/);
  assert.match(main, /selectSnapshotPrefixes/);
  assert.match(main, /cachedSubnets\[t\.name\] = r/);
  assert.match(
    main,
    /localStorage\.setItem\(\s*"ipv4-whitelisted-subnets_cachedSubnets"/,
  );
});
