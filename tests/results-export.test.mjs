import assert from "node:assert/strict";
import test from "node:test";
import {
  createResultsExport,
  saveResultsExport,
} from "../ru/ipv4-whitelisted-subnets/results-export.mjs";

const rows = [
  { provider: "AEZA — all networks", cidr: "138.124.59.0/24", aliveCount: 4 },
];

test("results export is an iOS-friendly UTF-8 CSV file", () => {
  const result = createResultsExport(
    rows,
    new Date("2026-08-18T20:45:12.000Z"),
  );

  assert.equal(
    result.filename,
    "ipv4-whitelisted-subnets-2026-08-18T20-45-12.000Z.csv",
  );
  assert.equal(result.mimeType, "text/csv;charset=utf-8");
  assert.equal(
    result.content,
    "\uFEFFcheckedAt;provider;cidr;aliveCount\n" +
      '2026-08-18T20:45:12.000Z;"AEZA — all networks";138.124.59.0/24;4',
  );
});

test("results use the share sheet when file sharing is supported", async () => {
  const shared = [];
  const navigatorObject = {
    canShare: ({ files }) => files.length === 1,
    share: async (payload) => shared.push(payload),
  };

  const result = await saveResultsExport(rows, {
    now: new Date("2026-08-18T20:45:12.000Z"),
    navigatorObject,
  });

  assert.equal(result, "shared");
  assert.equal(shared.length, 1);
  assert.equal(
    shared[0].files[0].name,
    "ipv4-whitelisted-subnets-2026-08-18T20-45-12.000Z.csv",
  );
  assert.equal(shared[0].files[0].type, "text/csv;charset=utf-8");
});

test("results fall back to a browser download", async () => {
  const actions = [];
  const anchor = {
    click: () => actions.push("clicked"),
    remove: () => actions.push("removed"),
  };
  const documentObject = {
    createElement: () => anchor,
    body: { append: () => actions.push("appended") },
  };
  const urlObject = {
    createObjectURL: () => "blob:results",
    revokeObjectURL: () => actions.push("revoked"),
  };

  const result = await saveResultsExport(rows, {
    now: new Date("2026-08-18T20:45:12.000Z"),
    navigatorObject: {},
    documentObject,
    urlObject,
  });

  assert.equal(result, "downloaded");
  assert.equal(
    anchor.download,
    "ipv4-whitelisted-subnets-2026-08-18T20-45-12.000Z.csv",
  );
  assert.deepEqual(actions.slice(0, 3), ["appended", "clicked", "removed"]);
});
