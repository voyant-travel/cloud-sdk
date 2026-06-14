/**
 * Configuration helper for the Voyant search surface.
 *
 * Voyant's search-api is a thin proxy in front of Typesense. It auths
 * incoming requests against a Voyant API token, picks the right scoped
 * Typesense key (read or write) server-side, and rewrites collection
 * names so customers never see our internal isolation prefix.
 *
 * The wire protocol is pure Typesense, so we don't ship a hand-rolled
 * SDK surface for it. Instead, this helper produces a config object
 * that you pass directly to the official `typesense` client:
 *
 * ```ts
 * import { Client } from "typesense";
 * import { createSearchClientConfig } from "@voyant-travel/cloud-sdk";
 *
 * const search = new Client(createSearchClientConfig({
 *   apiKey: process.env.VOYANT_API_TOKEN!,
 *   organizationSlug: "acme",
 *   projectName: "catalog",
 * }));
 *
 * await search.collections().create({
 *   name: "products",
 *   fields: [{ name: "name", type: "string" }],
 * });
 * ```
 *
 * `apiKey` here is your Voyant API token — it is sent as
 * `Authorization: Bearer ...`. The proxy strips Typesense's own
 * `X-TYPESENSE-API-KEY` header from inbound requests and injects the
 * project's scoped key downstream.
 */

const DEFAULT_SEARCH_HOST = "search.voyant.travel";
const DEFAULT_SEARCH_PORT = 443;
const DEFAULT_SEARCH_PROTOCOL = "https";

export interface SearchClientConfigOptions {
  /** Voyant API token with `search:read` (queries) or `search:write` (writes) scope. */
  apiKey: string;
  /** Organization slug — the first path segment in the search URL. */
  organizationSlug: string;
  /** Search project name — the second path segment in the search URL. */
  projectName: string;
  /** Override the default `search.voyant.travel` host (e.g. for local dev). */
  host?: string;
  /** Override the default port. */
  port?: number;
  /** Override the default `https` protocol. */
  protocol?: string;
  /** Additional headers to merge with `Authorization`. */
  additionalHeaders?: Record<string, string>;
}

export interface SearchClientConfig {
  apiKey: string;
  nodes: Array<{
    host: string;
    port: number;
    protocol: string;
    path: string;
  }>;
  additionalHeaders: Record<string, string>;
}

/**
 * Build a Typesense client configuration that targets the Voyant
 * search proxy. Pass the returned object straight to
 * `new Typesense.Client(...)`.
 */
export function createSearchClientConfig(
  options: SearchClientConfigOptions,
): SearchClientConfig {
  const {
    apiKey,
    organizationSlug,
    projectName,
    host = DEFAULT_SEARCH_HOST,
    port = DEFAULT_SEARCH_PORT,
    protocol = DEFAULT_SEARCH_PROTOCOL,
    additionalHeaders,
  } = options;

  if (!apiKey) {
    throw new Error("createSearchClientConfig: `apiKey` is required.");
  }
  if (!organizationSlug) {
    throw new Error(
      "createSearchClientConfig: `organizationSlug` is required.",
    );
  }
  if (!projectName) {
    throw new Error("createSearchClientConfig: `projectName` is required.");
  }

  return {
    // typesense-js requires `apiKey`. The proxy strips the
    // X-TYPESENSE-API-KEY header it adds and uses our bearer token
    // instead, so this value is ignored downstream — but it must be
    // a non-empty string for the client to construct.
    apiKey: "voyant-bearer",
    nodes: [
      {
        host,
        port,
        protocol,
        path: `/${organizationSlug}/${projectName}`,
      },
    ],
    additionalHeaders: {
      ...additionalHeaders,
      Authorization: `Bearer ${apiKey}`,
    },
  };
}
