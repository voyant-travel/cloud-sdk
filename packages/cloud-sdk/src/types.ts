import type { VoyantTransportOptions } from "@voyant-sdk/sdk-core";

export type VoyantCloudClientOptions = VoyantTransportOptions;

export type PhoneNumberStatus = "active" | "suspended" | "released";

export type SmsMessageStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "undelivered"
  | "failed";

export type VerificationChannel = "sms" | "call" | "email" | "whatsapp";

export type VerificationAttemptStatus =
  | "pending"
  | "approved"
  | "canceled"
  | "expired"
  | "failed";

export type EmailMessageStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "delivery_delayed"
  | "bounced"
  | "complained"
  | "opened"
  | "clicked"
  | "failed";

export interface PhoneNumberCapabilities {
  mms?: boolean;
  sms?: boolean;
  voice?: boolean;
}

export interface VaultSummary {
  createdAt: string;
  description: string | null;
  id: string;
  name: string;
  secretCount: number;
  slug: string;
  updatedAt: string;
}

export interface VaultSecretSummary {
  createdAt: string;
  key: string;
  updatedAt: string;
  version: number;
}

export interface VaultSecretValue {
  key: string;
  updatedAt: string;
  value: string;
  version: number;
}

export interface PhoneNumberSummary {
  capabilities: PhoneNumberCapabilities;
  country: string;
  createdAt: string;
  friendlyName: string | null;
  id: string;
  isShared: boolean;
  monthlyCostCents: number | null;
  organizationId: string;
  phoneNumber: string;
  purchasedAt: string | null;
  releasedAt: string | null;
  status: PhoneNumberStatus;
  updatedAt: string;
}

export interface SmsMessageSummary {
  body: string;
  createdAt: string;
  deliveredAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  fromNumber: string;
  id: string;
  lastEventAt: string | null;
  organizationId: string;
  priceCents: number | null;
  providerMessageSid: string | null;
  providerStatus: string | null;
  segments: number;
  sentAt: string | null;
  status: SmsMessageStatus;
  toNumber: string;
  updatedAt: string;
}

export interface SendSmsInput {
  body: string;
  from?: string | null;
  to: string;
}

export interface VerificationAttemptSummary {
  channel: VerificationChannel;
  createdAt: string;
  errorMessage: string | null;
  id: string;
  organizationId: string;
  providerStatus: string | null;
  serviceId: string;
  status: VerificationAttemptStatus;
  toValue: string;
  updatedAt: string;
  verifiedAt: string | null;
}

export interface VerificationCheckResult extends VerificationAttemptSummary {
  valid: boolean;
}

export interface StartVerificationInput {
  channel?: VerificationChannel;
  locale?: string;
  to: string;
}

export interface CheckVerificationInput {
  code: string;
  to: string;
}

export interface EmailMessageSummary {
  bccAddresses: string[];
  ccAddresses: string[];
  clickCount: number;
  createdAt: string;
  deliveredAt: string | null;
  errorMessage: string | null;
  fromAddress: string;
  id: string;
  lastEventAt: string | null;
  openCount: number;
  organizationId: string;
  providerEmailId: string | null;
  providerStatus: string | null;
  replyTo: string[];
  sentAt: string | null;
  status: EmailMessageStatus;
  subject: string;
  toAddresses: string[];
  updatedAt: string;
}

export interface SendEmailAttachment {
  /** Filename presented to the recipient. */
  filename: string;
  /** Base64-encoded file bytes. Mutually exclusive with `path`. */
  content?: string;
  /** Public URL the email provider will fetch. Mutually exclusive with `content`. */
  path?: string;
  /** MIME type override (e.g. "application/pdf"). */
  contentType?: string;
  /** Content-ID for inline images referenced via `cid:` in HTML. */
  contentId?: string;
}

export interface SendEmailInput {
  attachments?: SendEmailAttachment[] | null;
  bcc?: string[] | null;
  cc?: string[] | null;
  from: string;
  html?: string | null;
  replyTo?: string[] | null;
  subject: string;
  text?: string | null;
  to: string[];
}

export type BrowserSessionStatus = "active" | "closed" | "expired";

export type BrowserJobKind = "crawl";

export type BrowserJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "errored"
  | "cancelled_due_to_timeout"
  | "cancelled_due_to_limits"
  | "cancelled_by_user";

export type BrowserWaitUntil =
  | "load"
  | "domcontentloaded"
  | "networkidle0"
  | "networkidle2";

export type BrowserSameSite = "Strict" | "Lax" | "None";

export interface BrowserCookie {
  name: string;
  value: string;
  url?: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: BrowserSameSite;
}

export interface BrowserViewport {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  isLandscape?: boolean;
}

export interface BrowserGoToOptions {
  timeout?: number;
  waitUntil?: BrowserWaitUntil;
  referer?: string;
}

export interface BrowserWaitForSelector {
  selector: string;
  timeout?: number;
  visible?: boolean;
  hidden?: boolean;
}

export interface BrowserScreenshotOptions {
  fullPage?: boolean;
  omitBackground?: boolean;
  type?: "png" | "jpeg" | "webp";
  quality?: number;
  clip?: { x: number; y: number; width: number; height: number };
}

export interface BrowserPdfOptions {
  format?:
    | "letter"
    | "legal"
    | "tabloid"
    | "ledger"
    | "a0"
    | "a1"
    | "a2"
    | "a3"
    | "a4"
    | "a5"
    | "a6";
  landscape?: boolean;
  printBackground?: boolean;
  scale?: number;
  margin?: {
    top?: number | string;
    bottom?: number | string;
    left?: number | string;
    right?: number | string;
  };
}

/**
 * Common request fields accepted by every browser render endpoint. Forwarded
 * to Cloudflare Browser Rendering, so any field supported by that API is
 * accepted as well via the index signature.
 */
export interface BrowserRenderInput {
  url?: string;
  html?: string;
  cookies?: BrowserCookie[];
  viewport?: BrowserViewport;
  userAgent?: string;
  setExtraHTTPHeaders?: Record<string, string>;
  authenticate?: { username: string; password: string };
  rejectResourceTypes?: string[];
  rejectRequestPattern?: string[];
  allowResourceTypes?: string[];
  allowRequestPattern?: string[];
  bestAttempt?: boolean;
  emulateMediaType?: "screen" | "print";
  /**
   * Page navigation options forwarded to Cloudflare Browser Rendering.
   * Field name is `gotoOptions` (all-lowercase past the verb) to
   * match CF's API schema — anything else (e.g. `goToOptions`) is
   * rejected with `unrecognized_keys`.
   */
  gotoOptions?: BrowserGoToOptions;
  waitForSelector?: BrowserWaitForSelector;
  waitForTimeout?: number;
  [key: string]: unknown;
}

export interface BrowserScreenshotInput extends BrowserRenderInput {
  selector?: string;
  screenshotOptions?: BrowserScreenshotOptions;
}

export interface BrowserPdfInput extends BrowserRenderInput {
  pdfOptions?: BrowserPdfOptions;
}

export interface BrowserScrapeElement {
  selector: string;
}

export interface BrowserScrapeInput extends BrowserRenderInput {
  elements?: BrowserScrapeElement[];
}

export interface BrowserScrapeResult {
  results: Array<{
    selector: string;
    results: Array<{
      text: string;
      attributes: Array<{ name: string; value: string }>;
      html?: string;
      width?: number;
      height?: number;
      top?: number;
      left?: number;
    }>;
  }>;
}

export interface BrowserLink {
  url: string;
  text?: string;
}

export interface BrowserSnapshotResult {
  content: string;
  screenshot: string;
}

export interface BrowserJsonInput extends BrowserRenderInput {
  prompt?: string;
  responseFormat?: { type: "json_schema"; schema: unknown };
}

export interface StartBrowserCrawlInput {
  url: string;
  [key: string]: unknown;
}

export interface BrowserCrawlSummary {
  id: string;
  kind: BrowserJobKind;
  status: BrowserJobStatus;
  inputUrl: string;
  browserMsUsed: number;
  resultSummary: {
    total?: number;
    finished?: number;
    errored?: number;
    cursor?: string | null;
  } | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface StartBrowserCrawlResult {
  id: string;
  status: BrowserJobStatus;
  providerJobId: string;
}

export interface OpenBrowserSessionInput {
  /** Human-readable label persisted on the session record. */
  label?: string | null;
  /** Keep-alive duration in milliseconds. Capped server-side at 1 hour. */
  keepAliveMs?: number;
}

export interface BrowserSessionSummary {
  id: string;
  organizationId: string;
  apiTokenId: string | null;
  status: BrowserSessionStatus;
  label: string | null;
  browserMsUsed: number;
  commandCount: number;
  keepAliveMs: number;
  lastUsedAt: string;
  closedAt: string | null;
  createdAt: string;
}

export type BrowserCommand =
  | { op: "goto"; url: string; options?: BrowserGoToOptions }
  | {
      op: "waitForSelector";
      selector: string;
      options?: { timeout?: number; visible?: boolean; hidden?: boolean };
    }
  | { op: "waitForNavigation"; options?: BrowserGoToOptions }
  | { op: "waitForTimeout"; ms: number }
  | {
      op: "click";
      selector: string;
      options?: {
        button?: "left" | "right" | "middle";
        clickCount?: number;
        delay?: number;
      };
    }
  | {
      op: "type";
      selector: string;
      text: string;
      options?: { delay?: number };
    }
  | { op: "select"; selector: string; values: string[] }
  | { op: "screenshot"; options?: BrowserScreenshotOptions }
  | { op: "pdf"; options?: BrowserPdfOptions }
  | { op: "content" }
  | { op: "title" }
  | { op: "url" }
  | { op: "evaluate"; script: string }
  | { op: "cookies.get"; urls?: string[] }
  | { op: "cookies.set"; cookies: BrowserCookie[] }
  | {
      op: "setViewport";
      width: number;
      height: number;
      deviceScaleFactor?: number;
    }
  | { op: "setUserAgent"; userAgent: string }
  | { op: "setExtraHTTPHeaders"; headers: Record<string, string> };

export type BrowserCommandResult = {
  op: BrowserCommand["op"];
  durationMs: number;
} & ({ ok: true; result: unknown } | { ok: false; error: string });

export interface RunBrowserCommandsInput {
  commands: BrowserCommand[];
}

export interface RunBrowserCommandsResult {
  sessionId: string;
  results: BrowserCommandResult[];
  totalMs: number;
}

export type VideoStatus =
  | "pending_upload"
  | "downloading"
  | "processing"
  | "ready"
  | "error";

export type VideoCaptionStatus = "uploaded" | "inprogress" | "ready" | "error";

export type VideoDownloadStatus = "disabled" | "inprogress" | "ready" | "error";

export type VideoWatermarkPosition =
  | "upperRight"
  | "upperLeft"
  | "lowerRight"
  | "lowerLeft"
  | "center";

export interface VideoSummary {
  id: string;
  organizationId: string;
  providerVideoUid: string | null;
  name: string | null;
  status: VideoStatus;
  readyToStream: boolean;
  durationSeconds: number | null;
  sizeBytes: number | null;
  inputWidth: number | null;
  inputHeight: number | null;
  thumbnailUrl: string | null;
  thumbnailTimestampPct: number;
  playbackHlsUrl: string | null;
  playbackDashUrl: string | null;
  requireSignedUrls: boolean;
  allowedOrigins: string[];
  tags: string[];
  maxDurationSeconds: number | null;
  maxSizeBytes: number | null;
  watermarkProfileId: string | null;
  downloadStatus: VideoDownloadStatus;
  downloadReadyAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  meta: Record<string, string>;
  uploadedAt: string | null;
  readyAt: string | null;
  lastEventAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VideoUploadTicket {
  video: VideoSummary;
  uploadUrl: string;
  uploadExpiresAt: string | null;
}

export interface VideoCaptionSummary {
  id: string;
  videoId: string;
  organizationId: string;
  language: string;
  label: string | null;
  status: VideoCaptionStatus;
  generated: boolean;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VideoWatermarkProfileSummary {
  id: string;
  organizationId: string;
  providerWatermarkUid: string;
  name: string;
  imageUrl: string | null;
  sizeBytes: number | null;
  height: number | null;
  width: number | null;
  opacity: number;
  padding: number;
  scale: number;
  position: VideoWatermarkPosition;
  createdAt: string;
  updatedAt: string;
}

export interface VideoSignedToken {
  videoId: string;
  token: string;
  expiresAt: number;
}

export interface CreateVideoUploadInput {
  /** Total file size in bytes. Used as the TUS `Upload-Length`. Max 30 GB. */
  fileSize: number;
  /** Cloudflare Stream caps total length at 21,600 seconds (6 hours). */
  maxDurationSeconds: number;
  name?: string | null;
  requireSignedUrls?: boolean;
  allowedOrigins?: string[];
  /** Free-form labels. Max 50 tags, each up to 64 characters. */
  tags?: string[];
  watermarkProfileId?: string | null;
  thumbnailTimestampPct?: number | null;
  meta?: Record<string, string>;
}

export interface CreateVideoFromUrlInput {
  url: string;
  name?: string | null;
  requireSignedUrls?: boolean;
  allowedOrigins?: string[];
  /** Free-form labels. Max 50 tags, each up to 64 characters. */
  tags?: string[];
  watermarkProfileId?: string | null;
  thumbnailTimestampPct?: number | null;
  meta?: Record<string, string>;
}

export interface UpdateVideoInput {
  name?: string | null;
  thumbnailTimestampPct?: number;
  requireSignedUrls?: boolean;
  allowedOrigins?: string[];
  /** Replaces the existing tag set. Max 50 tags, each up to 64 characters. */
  tags?: string[];
  meta?: Record<string, string>;
}

export interface MintVideoSignedTokenInput {
  /** Token lifetime in seconds. Range 60–86400, default 3600. */
  expiresInSeconds?: number;
  downloadable?: boolean;
}

export interface UploadVideoCaptionInput {
  /** BCP-47 language tag (e.g. "en", "pt-BR"). */
  language: string;
  label?: string | null;
  vtt: string;
}

export interface GenerateVideoCaptionInput {
  language: string;
  label?: string | null;
}

export interface CreateVideoWatermarkInput {
  name: string;
  url: string;
  opacity?: number;
  padding?: number;
  scale?: number;
  position?: VideoWatermarkPosition;
}
