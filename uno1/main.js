export const SERVERS = [
  {
    id: "UNO1.DE-01",
    location: "Germany",
    country: "🇩🇪",
    host: "de1.uno1.fyi",
    ip: "37.46.18.193",
    asn: 210546,
    holder: "CHSL-ONE CHSL ONE LTD",
  },
  {
    id: "UNO1.FI-01",
    location: "Finland",
    country: "🇫🇮",
    host: "fi1.uno1.fyi",
    ip: "138.124.59.191",
    asn: 210644,
    holder: "AEZA-AS AEZA GROUP LLC",
  },
  {
    id: "UNO1.SE-01",
    location: "Sweden",
    country: "🇸🇪",
    host: "se1.uno1.fyi",
    ip: "213.21.254.33",
    asn: 210644,
    holder: "AEZA-AS AEZA GROUP LLC",
  },
  {
    id: "UNO1.RU-01",
    location: "Moscow",
    country: "🇷🇺",
    host: "msk1.uno1.fyi",
    ip: "178.236.240.74",
    asn: 203273,
    holder: "NetCraftersOU NetCrafters OU",
  },
];

export const classifyTcp1620 = (alive, largePost) => {
  if (alive === "no") return "skip";
  if (largePost === "no" && alive === "yes") return "detected";
  if (largePost === "no") return "probably";
  if (largePost === "unknown" && alive === "yes") return "possible";
  if (largePost === "unknown") return "inconclusive";
  return "not detected";
};

export const compareProbe = (baseline, current) => {
  if (baseline !== "yes") return "not testable";
  if (current === "yes") return "available";
  if (current === "no") return "blocked";
  return "unavailable";
};

if (typeof document !== "undefined") {
  const CACHE_KEY = "uno1-owned-server-checker-v1";
  const CACHE_VERSION = 1;
  const DPI_BYTES = 64 * 1024;
  const TIMEOUT_MS = 15000;

  const cacheButton = document.getElementById("cache-btn");
  const checkButton = document.getElementById("check-btn");
  const status = document.getElementById("status");
  const observer = document.getElementById("observer");
  const results = document.querySelector("#results tbody");
  const log = document.getElementById("log");

  const appendLog = (message) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    log.textContent += `[${timestamp}] ${message}\n`;
    log.scrollTop = log.scrollHeight;
  };

  const withTimeout = async (url, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(
        `${url}${url.includes("?") ? "&" : "?"}t=${Math.random()}`,
        {
          ...options,
          cache: "no-store",
          credentials: "omit",
          redirect: "follow",
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timer);
    }
  };

  const probeHttps = async (host, method = "HEAD", body) => {
    try {
      await withTimeout(`https://${host}/`, { method, mode: "no-cors", body });
      return "yes";
    } catch (error) {
      return error.name === "AbortError" ? "no" : "unknown";
    }
  };

  const probeTcp1620 = async (host, alive) => {
    if (alive === "no") return "skip";
    const payload = new Uint8Array(DPI_BYTES);
    crypto.getRandomValues(payload);
    return classifyTcp1620(alive, await probeHttps(host, "POST", payload));
  };

  const readCache = () => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (
        cached?.version !== CACHE_VERSION ||
        typeof cached?.servers !== "object"
      )
        return null;
      const compatible = SERVERS.every(
        (server) => cached.servers[server.id]?.host === server.host,
      );
      return compatible ? cached : null;
    } catch {
      return null;
    }
  };

  const updateCacheState = () => {
    const cached = readCache();
    checkButton.disabled = !cached;
    observer.textContent = cached
      ? `Cached baseline: ${new Date(cached.savedAt).toLocaleString()}`
      : "No baseline cached — use unrestricted Wi-Fi first";
    return cached;
  };

  const cell = (text, kind = "") => {
    const element = document.createElement("td");
    element.textContent = text;
    element.className = kind;
    return element;
  };

  const prettyProbe = (value) => {
    if (value === "yes") return "Yes 🟢";
    if (value === "no") return "No 🔴";
    return "Unknown ⚠️";
  };

  const renderServer = async (server, index, mode, baseline) => {
    const row = document.createElement("tr");
    row.append(
      cell(server.id),
      cell(`${server.country} ${server.location} — ${server.host}`),
      cell(`${server.ip} · AS${server.asn} ${server.holder}`),
      cell(mode === "check" ? prettyProbe(baseline.https) : "Collecting…"),
      cell(mode === "check" ? "Checking…" : "—"),
      cell(mode === "check" ? "Waiting…" : "Caching…"),
      cell("Waiting…"),
    );
    results.append(row);

    const https = await probeHttps(server.host);
    const tcp1620 = await probeTcp1620(server.host, https);

    if (mode === "cache") {
      row.replaceChild(
        cell(prettyProbe(https), https === "yes" ? "ok" : "skip"),
        row.cells[3],
      );
      row.replaceChild(
        cell("Cached", https === "yes" ? "ok" : "skip"),
        row.cells[5],
      );
    } else {
      const comparison = compareProbe(baseline.https, https);
      const comparisonKind =
        comparison === "available"
          ? "ok"
          : comparison === "blocked"
            ? "bad"
            : "skip";
      row.replaceChild(
        cell(prettyProbe(https), https === "yes" ? "ok" : "skip"),
        row.cells[4],
      );
      row.replaceChild(cell(comparison, comparisonKind), row.cells[5]);
    }
    const tcpKind =
      tcp1620 === "not detected"
        ? "ok"
        : tcp1620 === "detected"
          ? "bad"
          : "skip";
    row.replaceChild(cell(tcp1620, tcpKind), row.cells[6]);
    appendLog(
      `${index + 1}/${SERVERS.length} ${server.host}: HTTPS=${https}, TCP16-20=${tcp1620}`,
    );
    return { host: server.host, https, tcp1620 };
  };

  const run = async (mode) => {
    const cached = mode === "check" ? readCache() : null;
    if (mode === "check" && !cached) {
      updateCacheState();
      return;
    }

    cacheButton.disabled = true;
    checkButton.disabled = true;
    status.textContent = mode === "cache" ? "Caching ⏰" : "Checking ⏰";
    status.className = "status-checking";
    results.textContent = "";
    log.textContent = "";

    const observations = await Promise.all(
      SERVERS.map((server, index) =>
        renderServer(server, index, mode, cached?.servers[server.id]),
      ),
    );

    if (mode === "cache") {
      const serverMap = Object.fromEntries(
        observations.map((observation, index) => [
          SERVERS[index].id,
          observation,
        ]),
      );
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          version: CACHE_VERSION,
          savedAt: new Date().toISOString(),
          servers: serverMap,
        }),
      );
    }

    status.textContent = mode === "cache" ? "Cached ⚡" : "Ready ⚡";
    status.className = "status-ready";
    cacheButton.disabled = false;
    updateCacheState();
  };

  document.addEventListener("DOMContentLoaded", () => {
    status.textContent = "Ready ⚡";
    cacheButton.disabled = false;
    updateCacheState();
  });

  cacheButton.addEventListener("click", () => run("cache"));
  checkButton.addEventListener("click", () => run("check"));
}
