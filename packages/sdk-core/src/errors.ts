/**
 * Stable, machine-readable error codes the Voyant APIs attach to error
 * responses (`body.code`). Branch on these instead of matching status codes or
 * human-readable messages. The set is open — treat an unknown string as a
 * generic failure rather than asserting exhaustiveness.
 */
export type CloudErrorCode =
  | "invalid_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "service_unavailable"
  | "internal";

export class VoyantApiError extends Error {
  readonly body: unknown;
  /** Stable error code from the response envelope (`body.code`), when present. */
  readonly code: string | null;
  readonly requestId: string | null;
  readonly status: number;

  constructor(
    message: string,
    options: {
      body: unknown;
      code?: string | null;
      requestId: string | null;
      status: number;
    },
  ) {
    super(message);
    this.name = "VoyantApiError";
    this.status = options.status;
    this.code = options.code ?? null;
    this.requestId = options.requestId;
    this.body = options.body;
  }
}
