const DNS_API = "https://dns.google/resolve";
const RIPE_API = "https://stat.ripe.net/data";
const DPI_BYTES = 64 * 1024;
const TIMEOUT_MS = 15000;

const startButton = document.getElementById("start-btn");
const status = document.getElementById("status");
const observer = document.getElementById("observer");
const results = document.querySelector("#results tbody");
const log = document.getElementById("log");
let servers = [];

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
      `${url}${url.includes("?") ? "&" : "?"}t=${crypto.randomUUID()}`,
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

const lookupAsn = async (ip) => {
  const response = await withTimeout(
    `${RIPE_API}/prefix-overview/data.json?resource=${encodeURIComponent(ip)}`,
  );
  const body = await response.json();
  const origin = body.data?.asns?.[0];
  return origin ? `AS${origin.asn} ${origin.holder}` : "ASN unavailable";
};

const resolveServer = async (host) => {
  const response = await withTimeout(
    `${DNS_API}?name=${encodeURIComponent(host)}&type=A`,
  );
  const body = await response.json();
  const addresses = (body.Answer || [])
    .filter((answer) => answer.type === 1)
    .map((answer) => answer.data);
  if (addresses.length === 0) throw new Error("no A record");
  const ip = addresses[0];
  return { ip, asn: await lookupAsn(ip) };
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
  const largePost = await probeHttps(host, "POST", payload);
  if (largePost === "no" && alive === "yes") return "detected";
  if (largePost === "no") return "probably";
  if (largePost === "unknown" && alive === "yes") return "possible";
  if (largePost === "unknown") return "unlikely";
  return "not detected";
};

const statusCell = (text, kind) => {
  const cell = document.createElement("td");
  cell.textContent = text;
  cell.className = kind;
  return cell;
};

const renderServer = async (server, index) => {
  const row = document.createElement("tr");
  const idCell = document.createElement("td");
  const serverCell = document.createElement("td");
  const networkCell = document.createElement("td");
  idCell.textContent = server.id;
  serverCell.textContent = `${server.country} ${server.location} — ${server.host}`;
  networkCell.textContent = "Resolving…";
  row.append(
    idCell,
    serverCell,
    networkCell,
    statusCell("Checking…", ""),
    statusCell("Waiting…", ""),
  );
  results.append(row);

  try {
    const network = await resolveServer(server.host);
    networkCell.textContent = `${network.ip} · ${network.asn}`;
  } catch (error) {
    networkCell.textContent = `DNS/ASN error: ${error.message}`;
    networkCell.className = "bad";
  }

  const alive = await probeHttps(server.host);
  row.replaceChild(
    statusCell(
      alive === "yes" ? "Yes 🟢" : alive === "no" ? "No 🔴" : "Unknown ⚠️",
      alive === "yes" ? "ok" : alive === "no" ? "bad" : "skip",
    ),
    row.cells[3],
  );
  const dpi = await probeTcp1620(server.host, alive);
  const dpiKind =
    dpi === "not detected" ? "ok" : dpi === "detected" ? "bad" : "skip";
  row.replaceChild(statusCell(dpi, dpiKind), row.cells[4]);
  appendLog(
    `${index + 1}/${servers.length} ${server.host}: HTTPS=${alive}, TCP16-20=${dpi}`,
  );
};

const fetchObserver = async () => {
  try {
    const ipResponse = await withTimeout(`${RIPE_API}/whats-my-ip/data.json`);
    const ip = (await ipResponse.json()).data.ip;
    observer.textContent = `Observer: ${ip} · ${await lookupAsn(ip)}`;
  } catch {
    observer.textContent = "Observer ASN unavailable";
  }
};

const run = async () => {
  startButton.disabled = true;
  status.textContent = "Checking ⏰";
  status.className = "status-checking";
  results.textContent = "";
  log.textContent = "";
  await fetchObserver();
  await Promise.all(servers.map(renderServer));
  status.textContent = "Ready ⚡";
  status.className = "status-ready";
  startButton.disabled = false;
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    servers = await (await withTimeout("./servers.json")).json();
    status.textContent = "Ready ⚡";
    startButton.disabled = false;
  } catch (error) {
    status.textContent = "Server list unavailable ⚠️";
    status.className = "status-error";
    appendLog(error.message);
  }
});

startButton.addEventListener("click", run);
