import { VoyantApiError } from "./errors.js";
import type { QueryParams, VoyantRequestOptions, VoyantTransportOptions } from "./types.js";

const DEFAULT_BASE_URL = "https://api.voyant.travel";

function appendQuery(url: URL, query: QueryParams | undefined) {
  if (!query) {
    return;
  }

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined || rawValue === null) {
      continue;
    }

    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (value === undefined || value === null) {
        continue;
      }

      url.searchParams.append(key, String(value));
    }
  }
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function isBodyInit(value: VoyantRequestOptions["body"]): value is BodyInit {
  return (
    value instanceof ArrayBuffer ||
    value instanceof Blob ||
    value instanceof FormData ||
    value instanceof ReadableStream ||
    value instanceof URLSearchParams ||
    typeof value === "string"
  );
}

function maybeJson(text: string, contentType: string | null) {
  if (!text) {
    return null;
  }

  if (contentType?.includes("application/json")) {
    return JSON.parse(text) as unknown;
  }

  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  return text;
}

function getErrorMessage(body: unknown, fallback: string) {
  if (typeof body === "string" && body.length > 0) {
    return body;
  }

  if (body && typeof body === "object") {
    // `message` is used by the Data API envelope; `error` by the Cloud and
    // Connect APIs (`{ error, code?, requestId? }`). Prefer whichever is present.
    for (const key of ["message", "error"] as const) {
      const value = (body as Record<string, unknown>)[key];
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }
  }

  return fallback;
}

function getErrorCode(body: unknown): string | null {
  if (
    body &&
    typeof body === "object" &&
    "code" in body &&
    typeof body.code === "string" &&
    body.code.length > 0
  ) {
    return body.code;
  }

  return null;
}

function toApiError(parsed: unknown, response: Response): VoyantApiError {
  return new VoyantApiError(
    getErrorMessage(parsed, `Request failed with status ${response.status}`),
    {
      body: parsed,
      code: getErrorCode(parsed),
      requestId: response.headers.get("x-request-id"),
      status: response.status,
    },
  );
}

export class VoyantTransport {
  readonly baseUrl: string;

  private readonly apiKey: string;
  private readonly authHeader: string;
  private readonly authScheme: string | null;
  private readonly defaultHeaders: HeadersInit | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly userAgent: string;

  constructor(options: VoyantTransportOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.defaultHeaders = options.headers;
    this.fetchImpl = options.fetch ?? fetch.bind(globalThis);
    this.authHeader = options.authHeader ?? "authorization";
    this.authScheme = options.authScheme === undefined ? "Bearer" : options.authScheme;
    this.userAgent = options.userAgent ?? "voyant-sdk";
  }

  async request<T>(path: string, options: VoyantRequestOptions = {}) {
    const url = new URL(normalizePath(path), this.baseUrl.endsWith("/") ? this.baseUrl : `${this.baseUrl}/`);
    appendQuery(url, options.query);

    const headers = new Headers(this.defaultHeaders);
    headers.set(
      this.authHeader,
      this.authScheme ? `${this.authScheme} ${this.apiKey}` : this.apiKey,
    );
    headers.set("x-voyant-sdk", this.userAgent);

    if (options.headers) {
      new Headers(options.headers).forEach((value, key) => {
        headers.set(key, value);
      });
    }

    let body: BodyInit | undefined;
    if (options.body != null) {
      if (isBodyInit(options.body)) {
        body = options.body;
      } else {
        headers.set("content-type", "application/json");
        body = JSON.stringify(options.body);
      }
    }

    const response = await this.fetchImpl(url, {
      body,
      headers,
      method: options.method ?? "GET",
      signal: options.signal,
    });

    const responseType = options.responseType ?? "json";

    if (responseType === "binary") {
      if (!response.ok) {
        const text = await response.text();
        throw toApiError(maybeJson(text, response.headers.get("content-type")), response);
      }
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer) as T;
    }

    const text = await response.text();

    if (responseType === "text") {
      if (!response.ok) {
        throw toApiError(maybeJson(text, response.headers.get("content-type")), response);
      }
      return text as T;
    }

    const parsed = maybeJson(text, response.headers.get("content-type"));

    if (!response.ok) {
      throw toApiError(parsed, response);
    }

    if (options.unwrapData === false) {
      return parsed as T;
    }

    if (parsed && typeof parsed === "object" && "data" in parsed) {
      return parsed.data as T;
    }

    return parsed as T;
  }
}
