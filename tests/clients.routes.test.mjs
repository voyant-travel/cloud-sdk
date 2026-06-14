import assert from "node:assert/strict";
import test from "node:test";

import { createVoyantCloudClient } from "../packages/cloud-sdk/dist/index.js";

function createRecorder({ responseBody = { data: [] } } = {}) {
  const calls = [];

  return {
    calls,
    fetch: async (url, init) => {
      calls.push({
        body: init?.body,
        headers: new Headers(init?.headers),
        method: init?.method ?? "GET",
        url: String(url),
      });

      return new Response(JSON.stringify(responseBody), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    },
  };
}

test("cloud client composes vault routes correctly", async () => {
  const recorder = createRecorder({ responseBody: { data: [] } });
  const client = createVoyantCloudClient({
    apiKey: "vault_key",
    fetch: recorder.fetch,
  });

  await client.vault.listVaults();
  await client.vault.listSecrets("primary");
  await client.vault.getSecret("primary", "stripe-key");

  assert.equal(recorder.calls[0].url, "https://api.voyant.travel/vault/v1");
  assert.equal(recorder.calls[0].method, "GET");
  assert.equal(
    recorder.calls[0].headers.get("authorization"),
    "Bearer vault_key",
  );

  assert.equal(
    recorder.calls[1].url,
    "https://api.voyant.travel/vault/v1/primary/secrets",
  );
  assert.equal(
    recorder.calls[2].url,
    "https://api.voyant.travel/vault/v1/primary/secrets/stripe-key",
  );
});

test("cloud client composes vault crypto routes correctly", async () => {
  const recorder = createRecorder({
    responseBody: {
      data: {
        ciphertext: "AAAA",
        plaintext: "hello",
        dek: "AAAA",
        wrappedDek: "BBBB",
      },
    },
  });
  const client = createVoyantCloudClient({
    apiKey: "vault_key",
    fetch: recorder.fetch,
  });

  await client.vault.encrypt("primary", "hello");
  await client.vault.decrypt("primary", "AAAA");
  await client.vault.generateDataKey("primary");
  await client.vault.unwrap("primary", "BBBB");

  assert.equal(
    recorder.calls[0].url,
    "https://api.voyant.travel/vault/v1/primary/encrypt",
  );
  assert.equal(recorder.calls[0].method, "POST");
  assert.deepEqual(JSON.parse(recorder.calls[0].body), { plaintext: "hello" });

  assert.equal(
    recorder.calls[1].url,
    "https://api.voyant.travel/vault/v1/primary/decrypt",
  );
  assert.equal(recorder.calls[1].method, "POST");
  assert.deepEqual(JSON.parse(recorder.calls[1].body), { ciphertext: "AAAA" });

  assert.equal(
    recorder.calls[2].url,
    "https://api.voyant.travel/vault/v1/primary/generateDataKey",
  );
  assert.equal(recorder.calls[2].method, "POST");
  assert.equal(recorder.calls[2].body, undefined);

  assert.equal(
    recorder.calls[3].url,
    "https://api.voyant.travel/vault/v1/primary/unwrap",
  );
  assert.equal(recorder.calls[3].method, "POST");
  assert.deepEqual(JSON.parse(recorder.calls[3].body), { wrappedDek: "BBBB" });
});

test("cloud client composes sms phone-number and message routes correctly", async () => {
  const recorder = createRecorder({
    responseBody: { data: { id: "msg_123", status: "queued" } },
  });
  const client = createVoyantCloudClient({
    apiKey: "sms_key",
    fetch: recorder.fetch,
  });

  await client.sms.listPhoneNumbers();
  await client.sms.listMessages();
  await client.sms.sendMessage({
    to: "+14155551234",
    body: "hello",
    from: "+14155550000",
  });

  assert.equal(
    recorder.calls[0].url,
    "https://api.voyant.travel/sms/v1/phone-numbers",
  );
  assert.equal(recorder.calls[0].method, "GET");

  assert.equal(
    recorder.calls[1].url,
    "https://api.voyant.travel/sms/v1/messages",
  );

  assert.equal(
    recorder.calls[2].url,
    "https://api.voyant.travel/sms/v1/messages",
  );
  assert.equal(recorder.calls[2].method, "POST");
  assert.deepEqual(JSON.parse(recorder.calls[2].body), {
    to: "+14155551234",
    body: "hello",
    from: "+14155550000",
  });
});

test("cloud client composes email message routes correctly", async () => {
  const recorder = createRecorder({
    responseBody: { data: { id: "email_123", status: "queued" } },
  });
  const client = createVoyantCloudClient({
    apiKey: "email_key",
    fetch: recorder.fetch,
  });

  await client.email.listMessages();
  await client.email.sendMessage({
    from: "noreply@example.com",
    to: ["alice@example.com"],
    subject: "Welcome",
    text: "Hi",
  });
  await client.email.getMessage("email_123");

  assert.equal(
    recorder.calls[0].url,
    "https://api.voyant.travel/email/v1/messages",
  );
  assert.equal(recorder.calls[0].method, "GET");

  assert.equal(
    recorder.calls[1].url,
    "https://api.voyant.travel/email/v1/messages",
  );
  assert.equal(recorder.calls[1].method, "POST");
  assert.deepEqual(JSON.parse(recorder.calls[1].body), {
    from: "noreply@example.com",
    to: ["alice@example.com"],
    subject: "Welcome",
    text: "Hi",
  });

  assert.equal(
    recorder.calls[2].url,
    "https://api.voyant.travel/email/v1/messages/email_123",
  );
  assert.equal(recorder.calls[2].method, "GET");
});

test("cloud client composes video routes correctly", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({
      body: init?.body,
      method: init?.method ?? "GET",
      url: String(url),
    });
    if (init?.method === "DELETE") {
      return new Response(null, { status: 204 });
    }
    if (String(url).endsWith("/token")) {
      return new Response(
        JSON.stringify({
          data: {
            videoId: "vid_1",
            token: "signed.jwt.value",
            expiresAt: 1770000000,
            playbackHlsUrl:
              "https://customer-example.cloudflarestream.com/signed.jwt.value/manifest/video.m3u8",
            playbackDashUrl:
              "https://customer-example.cloudflarestream.com/signed.jwt.value/manifest/video.mpd",
          },
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
    }
    return new Response(JSON.stringify({ data: { id: "vid_1" } }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  };

  const client = createVoyantCloudClient({
    apiKey: "video_key",
    fetch: fetchImpl,
  });

  await client.video.videos.list();
  assert.equal(calls[0].url, "https://api.voyant.travel/video/v1/videos");
  assert.equal(calls[0].method, "GET");

  await client.video.videos.get("vid_1");
  assert.equal(calls[1].url, "https://api.voyant.travel/video/v1/videos/vid_1");

  await client.video.videos.createUpload({
    name: "demo",
    fileSize: 12345,
    maxDurationSeconds: 600,
    requireSignedUrls: true,
    tags: ["marketing", "launch"],
  });
  assert.equal(calls[2].url, "https://api.voyant.travel/video/v1/videos/upload");
  assert.equal(calls[2].method, "POST");
  assert.deepEqual(JSON.parse(calls[2].body), {
    name: "demo",
    fileSize: 12345,
    maxDurationSeconds: 600,
    requireSignedUrls: true,
    tags: ["marketing", "launch"],
  });

  await client.video.videos.createFromUrl({
    url: "https://example.com/clip.mp4",
    name: "imported",
  });
  assert.equal(
    calls[3].url,
    "https://api.voyant.travel/video/v1/videos/from-url",
  );

  await client.video.videos.update("vid_1", { name: "renamed" });
  assert.equal(calls[4].url, "https://api.voyant.travel/video/v1/videos/vid_1");
  assert.equal(calls[4].method, "PATCH");

  await client.video.videos.delete("vid_1");
  assert.equal(calls[5].url, "https://api.voyant.travel/video/v1/videos/vid_1");
  assert.equal(calls[5].method, "DELETE");

  await client.video.videos.enableDownload("vid_1");
  assert.equal(
    calls[6].url,
    "https://api.voyant.travel/video/v1/videos/vid_1/downloads",
  );
  assert.equal(calls[6].method, "POST");

  const playback = await client.video.videos.mintToken("vid_1", {
    expiresInSeconds: 600,
  });
  assert.equal(
    calls[7].url,
    "https://api.voyant.travel/video/v1/videos/vid_1/token",
  );
  assert.deepEqual(JSON.parse(calls[7].body), { expiresInSeconds: 600 });
  assert.equal(
    playback.playbackHlsUrl,
    "https://customer-example.cloudflarestream.com/signed.jwt.value/manifest/video.m3u8",
  );

  await client.video.videos.captions.list("vid_1");
  assert.equal(
    calls[8].url,
    "https://api.voyant.travel/video/v1/videos/vid_1/captions",
  );

  await client.video.videos.captions.upload("vid_1", {
    language: "en",
    vtt: "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nhello",
  });
  assert.equal(
    calls[9].url,
    "https://api.voyant.travel/video/v1/videos/vid_1/captions",
  );
  assert.equal(calls[9].method, "POST");

  await client.video.videos.captions.generate("vid_1", { language: "en" });
  assert.equal(
    calls[10].url,
    "https://api.voyant.travel/video/v1/videos/vid_1/captions/generate",
  );

  await client.video.videos.captions.delete("vid_1", "en");
  assert.equal(
    calls[11].url,
    "https://api.voyant.travel/video/v1/videos/vid_1/captions/en",
  );
  assert.equal(calls[11].method, "DELETE");

  await client.video.watermarks.list();
  assert.equal(calls[12].url, "https://api.voyant.travel/video/v1/watermarks");

  await client.video.watermarks.create({
    name: "logo",
    url: "https://example.com/logo.png",
    position: "lowerRight",
  });
  assert.equal(calls[13].url, "https://api.voyant.travel/video/v1/watermarks");
  assert.equal(calls[13].method, "POST");

  await client.video.watermarks.delete("vwp_1");
  assert.equal(
    calls[14].url,
    "https://api.voyant.travel/video/v1/watermarks/vwp_1",
  );
  assert.equal(calls[14].method, "DELETE");
});

test("cloud client composes browser render and binary routes correctly", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({
      body: init?.body,
      method: init?.method ?? "GET",
      url: String(url),
    });
    if (String(url).endsWith("/browser/v1/screenshot")) {
      return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
        headers: { "content-type": "image/png" },
        status: 200,
      });
    }
    if (String(url).endsWith("/browser/v1/pdf")) {
      return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
        headers: { "content-type": "application/pdf" },
        status: 200,
      });
    }
    return new Response(
      JSON.stringify({ success: true, result: "<html></html>" }),
      {
        headers: { "content-type": "application/json" },
        status: 200,
      },
    );
  };

  const client = createVoyantCloudClient({
    apiKey: "browser_key",
    fetch: fetchImpl,
  });

  const html = await client.browser.content({ url: "https://example.com" });
  assert.equal(html, "<html></html>");
  assert.equal(calls[0].url, "https://api.voyant.travel/browser/v1/content");
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(JSON.parse(calls[0].body), { url: "https://example.com" });

  await client.browser.markdown({ url: "https://example.com" });
  assert.equal(calls[1].url, "https://api.voyant.travel/browser/v1/markdown");

  await client.browser.snapshot({ url: "https://example.com" });
  assert.equal(calls[2].url, "https://api.voyant.travel/browser/v1/snapshot");

  await client.browser.scrape({
    url: "https://example.com",
    elements: [{ selector: "h1" }],
  });
  assert.equal(calls[3].url, "https://api.voyant.travel/browser/v1/scrape");

  await client.browser.links({ url: "https://example.com" });
  assert.equal(calls[4].url, "https://api.voyant.travel/browser/v1/links");

  await client.browser.json({
    url: "https://example.com",
    prompt: "extract the title",
  });
  assert.equal(calls[5].url, "https://api.voyant.travel/browser/v1/json");

  const screenshot = await client.browser.screenshot({
    url: "https://example.com",
  });
  assert.ok(screenshot instanceof Uint8Array);
  assert.equal(screenshot.length, 4);
  assert.equal(screenshot[0], 0x89);
  assert.equal(calls[6].url, "https://api.voyant.travel/browser/v1/screenshot");

  const pdf = await client.browser.pdf({ url: "https://example.com" });
  assert.ok(pdf instanceof Uint8Array);
  assert.equal(pdf[0], 0x25);
  assert.equal(calls[7].url, "https://api.voyant.travel/browser/v1/pdf");
});

test("cloud client composes browser crawl routes correctly", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({
      body: init?.body,
      method: init?.method ?? "GET",
      url: String(url),
    });
    if (init?.method === "DELETE") {
      return new Response(null, { status: 204 });
    }
    return new Response(
      JSON.stringify({
        id: "bjob_1",
        status: "running",
        providerJobId: "cf_1",
      }),
      {
        headers: { "content-type": "application/json" },
        status: 200,
      },
    );
  };

  const client = createVoyantCloudClient({
    apiKey: "browser_key",
    fetch: fetchImpl,
  });

  const start = await client.browser.crawls.start({
    url: "https://example.com",
  });
  assert.deepEqual(start, {
    id: "bjob_1",
    status: "running",
    providerJobId: "cf_1",
  });
  assert.equal(calls[0].url, "https://api.voyant.travel/browser/v1/crawl");
  assert.equal(calls[0].method, "POST");

  await client.browser.crawls.get("bjob_1");
  assert.equal(
    calls[1].url,
    "https://api.voyant.travel/browser/v1/crawl/bjob_1",
  );
  assert.equal(calls[1].method, "GET");

  await client.browser.crawls.cancel("bjob_1");
  assert.equal(
    calls[2].url,
    "https://api.voyant.travel/browser/v1/crawl/bjob_1",
  );
  assert.equal(calls[2].method, "DELETE");
});

test("cloud client composes browser session routes correctly", async () => {
  const recorder = createRecorder({
    responseBody: { data: { id: "bsess_1", status: "active" } },
  });
  const client = createVoyantCloudClient({
    apiKey: "browser_key",
    fetch: recorder.fetch,
  });

  await client.browser.sessions.open({ label: "test", keepAliveMs: 60_000 });
  assert.equal(
    recorder.calls[0].url,
    "https://api.voyant.travel/browser/v1/sessions",
  );
  assert.equal(recorder.calls[0].method, "POST");
  assert.deepEqual(JSON.parse(recorder.calls[0].body), {
    label: "test",
    keepAliveMs: 60_000,
  });

  await client.browser.sessions.list();
  assert.equal(
    recorder.calls[1].url,
    "https://api.voyant.travel/browser/v1/sessions",
  );
  assert.equal(recorder.calls[1].method, "GET");

  await client.browser.sessions.get("bsess_1");
  assert.equal(
    recorder.calls[2].url,
    "https://api.voyant.travel/browser/v1/sessions/bsess_1",
  );

  await client.browser.sessions.runCommands("bsess_1", {
    commands: [
      { op: "goto", url: "https://example.com" },
      { op: "screenshot" },
    ],
  });
  assert.equal(
    recorder.calls[3].url,
    "https://api.voyant.travel/browser/v1/sessions/bsess_1/commands",
  );
  assert.equal(recorder.calls[3].method, "POST");
  assert.deepEqual(JSON.parse(recorder.calls[3].body), {
    commands: [
      { op: "goto", url: "https://example.com" },
      { op: "screenshot" },
    ],
  });

  await client.browser.sessions.close("bsess_1");
  assert.equal(
    recorder.calls[4].url,
    "https://api.voyant.travel/browser/v1/sessions/bsess_1",
  );
  assert.equal(recorder.calls[4].method, "DELETE");
});

test("cloud client composes verification start, check, and attempts routes correctly", async () => {
  const recorder = createRecorder({
    responseBody: { data: { id: "ver_123", status: "approved", valid: true } },
  });
  const client = createVoyantCloudClient({
    apiKey: "verify_key",
    fetch: recorder.fetch,
  });

  await client.verification.start({
    to: "+14155551234",
    channel: "sms",
    locale: "en",
  });
  await client.verification.check({
    to: "+14155551234",
    code: "123456",
  });
  await client.verification.listAttempts();

  assert.equal(
    recorder.calls[0].url,
    "https://api.voyant.travel/verify/v1/start",
  );
  assert.equal(recorder.calls[0].method, "POST");
  assert.deepEqual(JSON.parse(recorder.calls[0].body), {
    to: "+14155551234",
    channel: "sms",
    locale: "en",
  });

  assert.equal(
    recorder.calls[1].url,
    "https://api.voyant.travel/verify/v1/check",
  );
  assert.equal(recorder.calls[1].method, "POST");
  assert.deepEqual(JSON.parse(recorder.calls[1].body), {
    to: "+14155551234",
    code: "123456",
  });

  assert.equal(
    recorder.calls[2].url,
    "https://api.voyant.travel/verify/v1/attempts",
  );
  assert.equal(recorder.calls[2].method, "GET");
});

test("cloud client composes realtime routes correctly", async () => {
  const recorder = createRecorder({
    responseBody: {
      data: {
        id: "rtm_1",
        channel: "orders:eu",
        event: "order.updated",
        data: { orderId: "ord_1" },
        publishedAt: "2026-06-12T00:00:00.000Z",
      },
    },
  });
  const client = createVoyantCloudClient({
    apiKey: "realtime_key",
    fetch: recorder.fetch,
  });

  await client.realtime.publish("orders:eu", {
    event: "order.updated",
    data: { orderId: "ord_1" },
  });
  assert.equal(
    recorder.calls[0].url,
    "https://api.voyant.travel/realtime/v1/channels/orders:eu/messages",
  );
  assert.equal(recorder.calls[0].method, "POST");
  assert.deepEqual(JSON.parse(recorder.calls[0].body), {
    event: "order.updated",
    data: { orderId: "ord_1" },
  });

  await client.realtime.publishBatch({
    messages: [{ channel: "orders:eu", event: "order.updated" }],
  });
  assert.equal(
    recorder.calls[1].url,
    "https://api.voyant.travel/realtime/v1/messages",
  );
  assert.equal(recorder.calls[1].method, "POST");
  assert.deepEqual(JSON.parse(recorder.calls[1].body), {
    messages: [{ channel: "orders:eu", event: "order.updated" }],
  });

  await client.realtime.history("orders:eu", { limit: 50, sinceId: "rtm_0" });
  assert.equal(
    recorder.calls[2].url,
    "https://api.voyant.travel/realtime/v1/channels/orders:eu/messages?limit=50&sinceId=rtm_0",
  );
  assert.equal(recorder.calls[2].method, "GET");

  await client.realtime.history("orders:eu");
  assert.equal(
    recorder.calls[3].url,
    "https://api.voyant.travel/realtime/v1/channels/orders:eu/messages",
  );

  await client.realtime.presence.get("orders:eu");
  assert.equal(
    recorder.calls[4].url,
    "https://api.voyant.travel/realtime/v1/channels/orders:eu/presence",
  );
  assert.equal(recorder.calls[4].method, "GET");

  await client.realtime.tokens.mint({
    clientId: "user_42",
    capabilities: { "orders:*": ["subscribe", "presence"] },
    ttlSeconds: 600,
  });
  assert.equal(
    recorder.calls[5].url,
    "https://api.voyant.travel/realtime/v1/tokens",
  );
  assert.equal(recorder.calls[5].method, "POST");
  assert.deepEqual(JSON.parse(recorder.calls[5].body), {
    clientId: "user_42",
    capabilities: { "orders:*": ["subscribe", "presence"] },
    ttlSeconds: 600,
  });
});
