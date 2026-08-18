const OFFICIAL_GEOFEED = "https://aeza.net/static/ipv4_f.csv";

export const AEZA_PROVIDER = Object.freeze({
  name: "AEZA — all networks",
  asns: [],
  prefixSource: "./providers/aeza-ipv4.json",
});

const isIpv4Cidr = (value) => {
  const match =
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d|[12]\d|3[0-2])$/.exec(
      value,
    );
  return Boolean(
    match && match.slice(1, 5).every((part) => Number(part) <= 255),
  );
};

export const parsePrefixSnapshot = (snapshot) => {
  if (
    snapshot?.source !== OFFICIAL_GEOFEED ||
    !Number.isFinite(Date.parse(snapshot?.retrievedAt)) ||
    !Array.isArray(snapshot?.prefixes) ||
    !Array.isArray(snapshot?.ownedOverrides)
  ) {
    throw new Error("Invalid AEZA prefix snapshot metadata");
  }

  const prefixes = [...snapshot.prefixes, ...snapshot.ownedOverrides];
  if (prefixes.length < 300 || prefixes.some((prefix) => !isIpv4Cidr(prefix))) {
    throw new Error("Invalid AEZA prefix snapshot contents");
  }

  const unique = [...new Set(prefixes)];
  if (unique.length !== prefixes.length) {
    throw new Error("Duplicate AEZA prefixes in snapshot");
  }
  return unique;
};

export const selectSnapshotPrefixes = (snapshot, only24) =>
  parsePrefixSnapshot(snapshot).filter(
    (prefix) => !only24 || prefix.endsWith("/24"),
  );
