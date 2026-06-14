import assert from "node:assert/strict";
import test from "node:test";

import { RealtimeChannel } from "../packages/cloud-sdk/dist/index.js";

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  static instances = [];

  constructor(url) {
    this.url = String(url);
    this.readyState = FakeWebSocket.CONNECTING;
    this.sent = [];
    this.listeners = new Map();
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(listener);
  }

  send(data) {
    this.sent.push(data);
  }

  close(code = 1000, reason = "") {
    if (this.readyState === FakeWebSocket.CLOSED) {
      return;
    }
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatch("close", { code, reason });
  }

  // Test helpers below.

  dispatch(type, event) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      listener(event);
    }
  }

  serverOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.dispatch("open", {});
  }

  serverFrame(frame) {
    this.dispatch("message", { data: JSON.stringify(frame) });
  }

  serverClose(code = 1006, reason = "") {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatch("close", { code, reason });
  }
}

function createChannel(options = {}) {
  FakeWebSocket.instances = [];
  const channel = new RealtimeChannel({
    channel: "orders:eu",
    token: "rtok_123",
    webSocket: FakeWebSocket,
    ...options,
  });
  return { channel, sockets: FakeWebSocket.instances };
}

test("realtime channel builds the connect URL from the base URL", () => {
  const { channel, sockets } = createChannel({ sinceId: "rtm_0" });

  assert.equal(sockets.length, 1);
  const url = new URL(sockets[0].url);
  assert.equal(url.protocol, "wss:");
  assert.equal(url.host, "api.voyant.travel");
  assert.equal(url.pathname, "/realtime/v1/connect");
  assert.equal(url.searchParams.get("channel"), "orders:eu");
  assert.equal(url.searchParams.get("token"), "rtok_123");
  assert.equal(url.searchParams.get("sinceId"), "rtm_0");

  channel.close();
});

test("realtime channel converts an http base URL to ws and omits sinceId", () => {
  const { channel, sockets } = createChannel({
    baseUrl: "http://localhost:8787",
  });

  const url = new URL(sockets[0].url);
  assert.equal(url.protocol, "ws:");
  assert.equal(url.host, "localhost:8787");
  assert.equal(url.pathname, "/realtime/v1/connect");
  assert.equal(url.searchParams.has("sinceId"), false);

  channel.close();
});

test("realtime channel dispatches server frames to handlers", () => {
  const { channel, sockets } = createChannel();
  const socket = sockets[0];

  const connected = [];
  const messages = [];
  const presence = [];
  const errors = [];

  channel.on("connected", (event) => connected.push(event));
  const offMessage = channel.on("message", (message) => messages.push(message));
  channel.on("presence", (event) => presence.push(event));
  channel.on("error", (event) => errors.push(event));

  socket.serverOpen();
  socket.serverFrame({ type: "connected", channel: "orders:eu" });
  socket.serverFrame({
    type: "message",
    id: "rtm_1",
    channel: "orders:eu",
    event: "order.updated",
    data: { orderId: "ord_1" },
    publishedAt: "2026-06-12T00:00:00.000Z",
  });
  socket.serverFrame({
    type: "presence",
    action: "enter",
    channel: "orders:eu",
    clientId: "user_42",
    data: { name: "Alice" },
    at: "2026-06-12T00:00:01.000Z",
  });
  socket.serverFrame({ type: "error", code: "forbidden", message: "nope" });
  socket.serverFrame({ type: "pong" });

  assert.deepEqual(connected, [{ channel: "orders:eu" }]);
  assert.deepEqual(messages, [
    {
      id: "rtm_1",
      channel: "orders:eu",
      event: "order.updated",
      data: { orderId: "ord_1" },
      publishedAt: "2026-06-12T00:00:00.000Z",
    },
  ]);
  assert.deepEqual(presence, [
    {
      action: "enter",
      channel: "orders:eu",
      clientId: "user_42",
      data: { name: "Alice" },
      at: "2026-06-12T00:00:01.000Z",
    },
  ]);
  assert.deepEqual(errors, [{ code: "forbidden", message: "nope" }]);

  // The returned unsubscribe function detaches the handler.
  offMessage();
  socket.serverFrame({
    type: "message",
    id: "rtm_2",
    channel: "orders:eu",
    event: "order.updated",
    data: null,
    publishedAt: "2026-06-12T00:00:02.000Z",
  });
  assert.equal(messages.length, 1);

  channel.close();
});

test("realtime channel reconnects with the last message id as sinceId", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });

  const { channel, sockets } = createChannel({ sinceId: "rtm_0" });
  const disconnects = [];
  channel.on("disconnected", (event) => disconnects.push(event));

  const first = sockets[0];
  first.serverOpen();
  first.serverFrame({ type: "connected", channel: "orders:eu" });
  first.serverFrame({
    type: "message",
    id: "rtm_7",
    channel: "orders:eu",
    event: "order.updated",
    data: null,
    publishedAt: "2026-06-12T00:00:00.000Z",
  });

  first.serverClose(1006);
  assert.deepEqual(disconnects, [
    { code: 1006, reason: "", willReconnect: true },
  ]);
  assert.equal(sockets.length, 1);

  // First backoff delay is jittered within (500ms, 1000ms].
  t.mock.timers.tick(1_000);
  assert.equal(sockets.length, 2);
  const url = new URL(sockets[1].url);
  assert.equal(url.searchParams.get("sinceId"), "rtm_7");

  channel.close();
});

test("realtime channel does not reconnect when reconnect is disabled", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });

  const { channel, sockets } = createChannel({ reconnect: false });
  const disconnects = [];
  channel.on("disconnected", (event) => disconnects.push(event));

  sockets[0].serverOpen();
  sockets[0].serverClose(1006);

  t.mock.timers.tick(60_000);
  assert.equal(sockets.length, 1);
  assert.deepEqual(disconnects, [
    { code: 1006, reason: "", willReconnect: false },
  ]);

  channel.close();
});

test("realtime channel close() stops reconnection and emits a final disconnect", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });

  const { channel, sockets } = createChannel();
  const disconnects = [];
  channel.on("disconnected", (event) => disconnects.push(event));

  sockets[0].serverOpen();
  channel.close();

  assert.deepEqual(disconnects, [
    { code: 1000, reason: "client closed", willReconnect: false },
  ]);

  t.mock.timers.tick(60_000);
  assert.equal(sockets.length, 1);
});

test("realtime channel sends publish and presence frames while connected", () => {
  const { channel, sockets } = createChannel();
  const socket = sockets[0];

  // Sends while disconnected are rejected, not queued.
  assert.throws(
    () => channel.publish("order.updated", { orderId: "ord_1" }),
    /not connected/,
  );

  socket.serverOpen();

  channel.publish("order.updated", { orderId: "ord_1" });
  channel.enterPresence({ name: "Alice" });
  channel.updatePresence({ name: "Alice", away: true });
  channel.leavePresence();

  assert.deepEqual(
    socket.sent.map((frame) => JSON.parse(frame)),
    [
      { type: "publish", event: "order.updated", data: { orderId: "ord_1" } },
      { type: "presence", action: "enter", data: { name: "Alice" } },
      {
        type: "presence",
        action: "update",
        data: { name: "Alice", away: true },
      },
      { type: "presence", action: "leave" },
    ],
  );

  channel.close();
  assert.throws(() => channel.publish("noop"), /closed/);
});
