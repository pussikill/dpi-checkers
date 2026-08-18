const MIME_TYPE = "text/csv;charset=utf-8";

const quoteCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;

export const createResultsExport = (results, now = new Date()) => {
  const checkedAt = now.toISOString();
  const filenameTimestamp = checkedAt.replaceAll(":", "-");
  const rows = results.map(
    ({ provider, cidr, aliveCount }) =>
      `${checkedAt};${quoteCsv(provider)};${cidr};${aliveCount}`,
  );

  return {
    filename: `ipv4-whitelisted-subnets-${filenameTimestamp}.csv`,
    mimeType: MIME_TYPE,
    content: "\uFEFFcheckedAt;provider;cidr;aliveCount\n" + rows.join("\n"),
  };
};

export const saveResultsExport = async (
  results,
  {
    now = new Date(),
    navigatorObject = globalThis.navigator,
    documentObject = globalThis.document,
    urlObject = globalThis.URL,
  } = {},
) => {
  const result = createResultsExport(results, now);
  const file = new File([result.content], result.filename, {
    type: result.mimeType,
  });
  const sharePayload = {
    title: "IPv4 whitelisted subnets",
    files: [file],
  };

  if (navigatorObject?.share && navigatorObject?.canShare?.(sharePayload)) {
    try {
      await navigatorObject.share(sharePayload);
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  const url = urlObject.createObjectURL(file);
  const anchor = documentObject.createElement("a");
  anchor.href = url;
  anchor.download = result.filename;
  anchor.hidden = true;
  documentObject.body.append(anchor);
  anchor.click();
  anchor.remove();
  globalThis.setTimeout(() => urlObject.revokeObjectURL(url), 0);
  return "downloaded";
};
