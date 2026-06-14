import assert from "node:assert/strict";
import test from "node:test";

import { createSearchClientConfig } from "../packages/cloud-sdk/dist/index.js";

test("createSearchClientConfig produces a valid Typesense node config", () => {
  const config = createSearchClientConfig({
    apiKey: "vk_test",
    organizationSlug: "acme",
    projectName: "catalog",
  });

  assert.equal(config.apiKey, "voyant-bearer");
  assert.deepEqual(config.nodes, [
    {
      host: "search.voyant.travel",
      port: 443,
      protocol: "https",
      path: "/acme/catalog",
    },
  ]);
  assert.equal(
    config.additionalHeaders.Authorization,
    "Bearer vk_test",
  );
});

test("createSearchClientConfig honors host/port/protocol overrides", () => {
  const config = createSearchClientConfig({
    apiKey: "vk_test",
    organizationSlug: "acme",
    projectName: "catalog",
    host: "127.0.0.1",
    port: 8788,
    protocol: "http",
  });

  assert.equal(config.nodes[0].host, "127.0.0.1");
  assert.equal(config.nodes[0].port, 8788);
  assert.equal(config.nodes[0].protocol, "http");
  assert.equal(config.nodes[0].path, "/acme/catalog");
});

test("createSearchClientConfig merges additionalHeaders without dropping Authorization", () => {
  const config = createSearchClientConfig({
    apiKey: "vk_test",
    organizationSlug: "acme",
    projectName: "catalog",
    additionalHeaders: { "X-Trace-Id": "abc-123" },
  });

  assert.equal(config.additionalHeaders.Authorization, "Bearer vk_test");
  assert.equal(config.additionalHeaders["X-Trace-Id"], "abc-123");
});

test("createSearchClientConfig keeps the bearer token authoritative against accidental overrides", () => {
  const config = createSearchClientConfig({
    apiKey: "vk_test",
    organizationSlug: "acme",
    projectName: "catalog",
    additionalHeaders: { Authorization: "Bearer wrong" },
  });

  assert.equal(config.additionalHeaders.Authorization, "Bearer vk_test");
});

test("createSearchClientConfig rejects empty required fields", () => {
  assert.throws(
    () =>
      createSearchClientConfig({
        apiKey: "",
        organizationSlug: "acme",
        projectName: "catalog",
      }),
    /apiKey/,
  );
  assert.throws(
    () =>
      createSearchClientConfig({
        apiKey: "vk_test",
        organizationSlug: "",
        projectName: "catalog",
      }),
    /organizationSlug/,
  );
  assert.throws(
    () =>
      createSearchClientConfig({
        apiKey: "vk_test",
        organizationSlug: "acme",
        projectName: "",
      }),
    /projectName/,
  );
});
