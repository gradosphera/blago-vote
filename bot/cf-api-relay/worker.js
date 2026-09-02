export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = new URL("https://api.telegram.org" + url.pathname + url.search);

    const headers = new Headers(request.headers);
    ["host", "content-length", "accept-encoding", "cf-connecting-ip", "cf-ray", "cf-visitor"].forEach(
      (h) => headers.delete(h)
    );

    const headersOut = new Headers({
      "content-type": "application/json",
      "x-relay-version": "3-timeout",
    });

    try {
      const resp = await fetch(target, {
        method: request.method,
        headers,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });

      const body = await resp.arrayBuffer();
      headersOut.set("x-upstream-status", String(resp.status));
      headersOut.set("x-upstream-bytes", String(body.byteLength));

      return new Response(body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: headersOut,
      });
    } catch (e) {
      headersOut.set("x-upstream-status", "ERR");
      headersOut.set("x-upstream-error", `${e.name}: ${e.message}`);

      const body = JSON.stringify({
        ok: false,
        error_code: 502,
        description: `relay upstream: ${e.name}: ${e.message}`,
      });

      return new Response(body, {
        status: 502,
        statusText: "Bad Gateway",
        headers: headersOut,
      });
    }
  },
};