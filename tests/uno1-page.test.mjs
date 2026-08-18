import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SERVERS, classifyTcp1620, compareProbe } from "../uno1/main.js";

const expected = [
  ["UNO1.DE-01", "Germany", "de1.uno1.fyi", "37.46.18.193", 210546],
  ["UNO1.FI-01", "Finland", "fi1.uno1.fyi", "138.124.59.191", 210644],
  ["UNO1.SE-01", "Sweden", "se1.uno1.fyi", "213.21.254.33", 210644],
  ["UNO1.RU-01", "Moscow", "msk1.uno1.fyi", "178.236.240.74", 203273],
];

test("UNO1 checker publishes exactly the four owned TLS hostnames", async () => {
  assert.deepEqual(
    SERVERS.map(({ id, location, host, ip, asn }) => [
      id,
      location,
      host,
      ip,
      asn,
    ]),
    expected,
  );
  assert.ok(SERVERS.every(({ host }) => host.endsWith(".uno1.fyi")));
});

test("unknown HTTPS and unknown large POST are inconclusive", () => {
  assert.equal(classifyTcp1620("unknown", "unknown"), "inconclusive");
});

test("cached success distinguishes mobile blocking from an untestable baseline", () => {
  assert.equal(compareProbe("yes", "yes"), "available");
  assert.equal(compareProbe("yes", "no"), "blocked");
  assert.equal(compareProbe("yes", "unknown"), "unavailable");
  assert.equal(compareProbe("unknown", "unknown"), "not testable");
});

test("UNO1 checker is a standalone browser page", async () => {
  const html = await readFile(
    new URL("../uno1/index.html", import.meta.url),
    "utf8",
  );
  assert.match(html, /<script type="module" src="main\.js/);
  assert.match(html, /UNO1 Server Checker/);
  assert.match(html, /id="cache-btn"[^>]*>Cache/);
  assert.match(html, /id="check-btn"[^>]*>Check/);
  assert.doesNotMatch(html, /subscription|uuid|privateKey/i);
});
