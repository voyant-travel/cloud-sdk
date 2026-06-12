/**
 * Subscriber client for Voyant Realtime channels.
 *
 * `RealtimeChannel` speaks the `GET /realtime/v1/connect` WebSocket
 * protocol directly — it does not go through the REST transport. It has
 * zero runtime dependencies and uses the global `WebSocket` constructor,
 * which is available in browsers, Cloudflare Workers, Deno, Bun, and
 * Node.js 21+. On older Node versions (or in tests), inject an
 * implementation via the `webSocket` option.
 *
 * Authentication uses a short-lived client token minted server-side with
 * `client.realtime.tokens.mint(...)`. Never hand an API key to a
 * subscriber — tokens are scoped to channels and capabilities and expire.
 *
 * ```ts
 * const channel = new RealtimeChannel({ channel: "orders:eu", token });
 *
 * const off = channel.on("message", (message) => {
 *   console.log(message.event, message.data);
 * });
 *
 * channel.enterPresence({ name: "Alice" });
 * channel.publish("cursor.moved", { x: 10, y: 20 }); // needs publish capability
 *
 * off();
 * channel.close();
 * ```
 */

import type { RealtimeMessageSummary } from "./types.js";

const DEFAULT_REALTIME_BASE_URL = "https://api.voyantjs.com";
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;

/** `WebSocket.OPEN` — referenced as a literal so injected fakes don't need statics. */
const WEB_SOCKET_OPEN = 1;

export interface RealtimeChannelOptions {
  /** Channel name to subscribe to. */
  channel: string;
  /**
   * Short-lived client token from `client.realtime.tokens.mint` —
   * NEVER an API key.
   */
  token: string;
  /**
   * HTTP(S) API origin; converted to ws(s):// for the connection.
   * Defaults to `https://api.voyantjs.com`.
   */
  baseUrl?: string;
  /** Resume point: replay history after this message id on connect. */
  sinceId?: string;
  /**
   * Auto-reconnect with exponential backoff (1s base, 30s cap, jitter)
   * when the connection drops. Defaults to `true`.
   */
  reconnect?: boolean;
  /** WebSocket implementation override for tests or Node < 21. */
  webSocket?: typeof WebSocket;
}

export type RealtimePresenceAction = "enter" | "leave" | "update";

export interface RealtimeChannelConnectedEvent {
  channel: string;
}

export interface RealtimeChannelPresenceEvent {
  action: RealtimePresenceAction;
  channel: string;
  clientId: string;
  data?: unknown;
  at: string;
}

export interface RealtimeChannelError {
  code: string;
  message: string;
}

export interface RealtimeChannelDisconnectedEvent {
  /** WebSocket close code, when one was provided. */
  code: number | null;
  /** WebSocket close reason, when one was provided. */
  reason: string | null;
  /** Whether the channel will automatically reconnect. */
  willReconnect: boolean;
}

export interface RealtimeChannelEventMap {
  connected: RealtimeChannelConnectedEvent;
  message: RealtimeMessageSummary;
  presence: RealtimeChannelPresenceEvent;
  error: RealtimeChannelError;
  disconnected: RealtimeChannelDisconnectedEvent;
}

type RealtimeServerFrame =
  | { type: "connected"; channel: string }
  | ({ type: "message" } & RealtimeMessageSummary)
  | ({ type: "presence" } & RealtimeChannelPresenceEvent)
  | { type: "error"; code: string; message: string }
  | { type: "pong" };

type RealtimeClientFrame =
  | { type: "publish"; event: string; data?: unknown }
  | { type: "presence"; action: "enter" | "update"; data?: unknown }
  | { type: "presence"; action: "leave" }
  | { type: "ping" };

type RealtimeChannelHandlers = {
  [K in keyof RealtimeChannelEventMap]: Set<
    (payload: RealtimeChannelEventMap[K]) => void
  >;
};

function toConnectUrl(
  baseUrl: string,
  channel: string,
  token: string,
  sinceId: string | undefined,
): string {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const url = new URL("realtime/v1/connect", base);

  if (url.protocol === "https:") {
    url.protocol = "wss:";
  } else if (url.protocol === "http:") {
    url.protocol = "ws:";
  }

  url.searchParams.set("channel", channel);
  url.searchParams.set("token", token);
  if (sinceId !== undefined) {
    url.searchParams.set("sinceId", sinceId);
  }

  return url.toString();
}

/**
 * A live subscription to a single realtime channel.
 *
 * The connection is opened in the constructor. Register handlers with
 * `on(event, handler)` — it returns an unsubscribe function. While
 * disconnected (including between reconnect attempts), `publish` and the
 * presence methods throw rather than queueing; wait for the next
 * `connected` event before sending again.
 *
 * The channel tracks the id of the last received message and passes it as
 * `sinceId` when it reconnects, so messages published during a drop are
 * replayed and none are lost.
 */
export class RealtimeChannel {
  readonly channel: string;

  private readonly token: string;
  private readonly baseUrl: string;
  private readonly reconnectEnabled: boolean;
  private readonly webSocketImpl: typeof WebSocket;
  private readonly handlers: RealtimeChannelHandlers = {
    connected: new Set(),
    message: new Set(),
    presence: new Set(),
    error: new Set(),
    disconnected: new Set(),
  };

  private socket: WebSocket | null = null;
  private lastMessageId: string | undefined;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(options: RealtimeChannelOptions) {
    const webSocketImpl =
      options.webSocket ??
      (globalThis as { WebSocket?: typeof WebSocket }).WebSocket;

    if (!webSocketImpl) {
      throw new Error(
        "RealtimeChannel: no global WebSocket implementation found. " +
          "Use a runtime with WebSocket support (browsers, workers, Node 21+) " +
          "or pass one via the `webSocket` option.",
      );
    }

    this.channel = options.channel;
    this.token = options.token;
    this.baseUrl = options.baseUrl ?? DEFAULT_REALTIME_BASE_URL;
    this.reconnectEnabled = options.reconnect ?? true;
    this.webSocketImpl = webSocketImpl;
    this.lastMessageId = options.sinceId;

    this.connect();
  }

  /**
   * Register a handler. Returns a function that unsubscribes it.
   */
  on<K extends keyof RealtimeChannelEventMap>(
    event: K,
    handler: (payload: RealtimeChannelEventMap[K]) => void,
  ): () => void {
    this.handlers[event].add(handler);
    return () => {
      this.handlers[event].delete(handler);
    };
  }

  /**
   * Publish a message to the channel over the socket. Requires the token
   * to carry the `publish` capability for this channel. Throws while
   * disconnected.
   */
  publish(event: string, data?: unknown): void {
    this.send({ type: "publish", event, data });
  }

  /** Enter the channel's presence set. Requires the `presence` capability. */
  enterPresence(data?: unknown): void {
    this.send({ type: "presence", action: "enter", data });
  }

  /** Update this client's presence data. Requires the `presence` capability. */
  updatePresence(data?: unknown): void {
    this.send({ type: "presence", action: "update", data });
  }

  /** Leave the channel's presence set. */
  leavePresence(): void {
    this.send({ type: "presence", action: "leave" });
  }

  /**
   * Permanently close the channel. Cancels any pending reconnect; a final
   * `disconnected` event with `willReconnect: false` is emitted when the
   * socket closes.
   */
  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;

    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.socket?.close(1000, "client closed");
  }

  private connect(): void {
    const url = toConnectUrl(
      this.baseUrl,
      this.channel,
      this.token,
      this.lastMessageId,
    );
    const socket = new this.webSocketImpl(url);
    this.socket = socket;

    socket.addEventListener("open", () => {
      if (socket !== this.socket) return;
      this.reconnectAttempts = 0;
    });

    socket.addEventListener("message", (event) => {
      if (socket !== this.socket) return;
      this.handleFrame((event as { data?: unknown }).data);
    });

    socket.addEventListener("close", (event) => {
      if (socket !== this.socket) return;
      this.socket = null;
      this.handleClose(event as { code?: number; reason?: string });
    });

    // Transport-level errors are always followed by a close event, which
    // drives the `disconnected` emit and reconnection; protocol errors
    // arrive as `error` frames. Nothing to surface here.
    socket.addEventListener("error", () => {});
  }

  private handleFrame(data: unknown): void {
    if (typeof data !== "string") {
      return;
    }

    let frame: RealtimeServerFrame;
    try {
      frame = JSON.parse(data) as RealtimeServerFrame;
    } catch {
      return;
    }

    switch (frame.type) {
      case "connected":
        this.emit("connected", { channel: frame.channel });
        break;
      case "message":
        this.lastMessageId = frame.id;
        this.emit("message", {
          id: frame.id,
          channel: frame.channel,
          event: frame.event,
          data: frame.data,
          publishedAt: frame.publishedAt,
        });
        break;
      case "presence":
        this.emit("presence", {
          action: frame.action,
          channel: frame.channel,
          clientId: frame.clientId,
          data: frame.data,
          at: frame.at,
        });
        break;
      case "error":
        this.emit("error", { code: frame.code, message: frame.message });
        break;
      case "pong":
        break;
    }
  }

  private handleClose(event: { code?: number; reason?: string }): void {
    const willReconnect = !this.closed && this.reconnectEnabled;

    this.emit("disconnected", {
      code: event.code ?? null,
      reason: event.reason ?? null,
      willReconnect,
    });

    if (willReconnect) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    const exponential = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_DELAY_MS,
    );
    // Jitter into [exponential / 2, exponential] to avoid thundering herds.
    const delay = exponential / 2 + Math.random() * (exponential / 2);

    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closed) {
        this.connect();
      }
    }, delay);
  }

  private send(frame: RealtimeClientFrame): void {
    if (this.closed) {
      throw new Error("RealtimeChannel is closed.");
    }

    const socket = this.socket;
    if (!socket || socket.readyState !== WEB_SOCKET_OPEN) {
      throw new Error(
        "RealtimeChannel is not connected. Sends while disconnected are " +
          "rejected — wait for the next `connected` event.",
      );
    }

    socket.send(JSON.stringify(frame));
  }

  private emit<K extends keyof RealtimeChannelEventMap>(
    event: K,
    payload: RealtimeChannelEventMap[K],
  ): void {
    for (const handler of [...this.handlers[event]]) {
      handler(payload);
    }
  }
}
