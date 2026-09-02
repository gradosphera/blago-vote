export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = new URL("https://api.telegram.org" + url.pathname + url.search);

    const headers = new Headers(request.headers);
    ["host", "content-length", "cf-connecting-ip", "cf-ray", "cf-visitor"].forEach(
      (h) => headers.delete(h)
    );

    const resp = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
    });

    const headersOut = new Headers(resp.headers);
    [
      "content-length",
      "content-encoding",
      "transfer-encoding",
      "connection",
      "keep-alive",
    ].forEach((h) => headersOut.delete(h));

    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: headersOut,
    });
  },
};