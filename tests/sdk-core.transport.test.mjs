import assert from "node:assert/strict";
import test from "node:test";

import { VoyantApiError, VoyantTransport } from "../packages/sdk-core/dist/index.js";

test("VoyantTransport serializes auth, query params, and JSON bodies", async () => {
  let requestUrl;
  let requestInit;

  const transport = new VoyantTransport({
    apiKey: "test_key",
    fetch: async (url, init) => {
      requestUrl = String(url);
      requestInit = init;

      return new Response(JSON.stringify({ data: { ok: true } }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    },
    userAgent: "voyant-sdk-tests",
  });

  const result = await transport.request("/v1/example", {
    body: { hello: "world" },
    method: "POST",
    query: {
      limit: 10,
      markets: ["ro", "us"],
      skip: undefined,
    },
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(
    requestUrl,
    "https://api.voyant.travel/v1/example?limit=10&markets=ro&markets=us",
  );
  assert.equal(requestInit.method, "POST");
  assert.equal(requestInit.body, JSON.stringify({ hello: "world" }));

  const headers = new Headers(requestInit.headers);
  assert.equal(headers.get("authorization"), "Bearer test_key");
  assert.equal(headers.get("content-type"), "application/json");
  assert.equal(headers.get("x-voyant-sdk"), "voyant-sdk-tests");
});

test("VoyantTransport can return the raw response envelope", async () => {
  const transport = new VoyantTransport({
    apiKey: "test_key",
    fetch: async () =>
      new Response(JSON.stringify({ data: { ok: true }, meta: { page: 1 } }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
  });

  const result = await transport.request("/v1/example", {
    unwrapData: false,
  });

  assert.deepEqual(result, { data: { ok: true }, meta: { page: 1 } });
});

test("VoyantTransport returns Uint8Array when responseType is binary", async () => {
  const transport = new VoyantTransport({
    apiKey: "test_key",
    fetch: async () =>
      new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
        headers: { "content-type": "image/png" },
        status: 200,
      }),
  });

  const result = await transport.request("/v1/screenshot", {
    method: "POST",
    responseType: "binary",
  });

  assert.ok(result instanceof Uint8Array);
  assert.deepEqual(Array.from(result), [0x89, 0x50, 0x4e, 0x47]);
});

test("VoyantTransport returns raw text when responseType is text", async () => {
  const transport = new VoyantTransport({
    apiKey: "test_key",
    fetch: async () =>
      new Response("# heading", {
        headers: { "content-type": "text/markdown" },
        status: 200,
      }),
  });

  const result = await transport.request("/v1/markdown", {
    method: "POST",
    responseType: "text",
  });

  assert.equal(result, "# heading");
});

test("VoyantTransport surfaces errors for binary requests", async () => {
  const transport = new VoyantTransport({
    apiKey: "test_key",
    fetch: async () =>
      new Response(JSON.stringify({ message: "boom" }), {
        headers: { "content-type": "application/json" },
        status: 502,
      }),
  });

  await assert.rejects(
    () =>
      transport.request("/v1/screenshot", {
        method: "POST",
        responseType: "binary",
      }),
    (error) => {
      assert.ok(error instanceof VoyantApiError);
      assert.equal(error.status, 502);
      assert.equal(error.message, "boom");
      return true;
    },
  );
});

test("VoyantTransport binds the global fetch so workerd doesn't reject `this`", async () => {
  // Cloudflare Workers (workerd) throws `TypeError: Illegal invocation` when
  // the global `fetch` is called with a receiver other than `globalThis`.
  // Reproduce that by stubbing `globalThis.fetch` with a function that asserts
  // its `this` binding, then construct a transport without an explicit `fetch`
  // override.
  const originalFetch = globalThis.fetch;
  let observedThis;
  globalThis.fetch = function stubFetch() {
    observedThis = this;
    if (this !== globalThis) {
      throw new TypeError(
        "Illegal invocation: function called with incorrect `this` reference.",
      );
    }
    return new Response(JSON.stringify({ data: { ok: true } }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  };

  try {
    const transport = new VoyantTransport({ apiKey: "test_key" });
    const result = await transport.request("/v1/example");
    assert.deepEqual(result, { ok: true });
    assert.equal(observedThis, globalThis);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("VoyantTransport throws VoyantApiError for non-2xx responses", async () => {
  const transport = new VoyantTransport({
    apiKey: "test_key",
    fetch: async () =>
      new Response(JSON.stringify({ message: "Nope" }), {
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_123",
        },
        status: 400,
      }),
  });

  await assert.rejects(
    () => transport.request("/v1/example"),
    (error) => {
      assert.ok(error instanceof VoyantApiError);
      assert.equal(error.message, "Nope");
      assert.equal(error.status, 400);
      assert.equal(error.requestId, "req_123");
      assert.equal(error.code, null);
      assert.deepEqual(error.body, { message: "Nope" });
      return true;
    },
  );
});

test("VoyantTransport surfaces the Cloud `{ error, code }` envelope", async () => {
  const transport = new VoyantTransport({
    apiKey: "test_key",
    fetch: async () =>
      new Response(
        JSON.stringify({ error: "Forbidden", code: "forbidden", requestId: "req_abc" }),
        {
          headers: {
            "content-type": "application/json",
            "x-request-id": "req_abc",
          },
          status: 403,
        },
      ),
  });

  await assert.rejects(
    () => transport.request("/cloud/v1/example"),
    (error) => {
      assert.ok(error instanceof VoyantApiError);
      // message now comes from the `error` key, not the (absent) `message` key.
      assert.equal(error.message, "Forbidden");
      assert.equal(error.status, 403);
      assert.equal(error.code, "forbidden");
      assert.equal(error.requestId, "req_abc");
      return true;
    },
  );
});
