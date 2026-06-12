import { VoyantTransport } from "@voyant-sdk/sdk-core";
import type {
  BrowserCrawlSummary,
  BrowserJsonInput,
  BrowserLink,
  BrowserPdfInput,
  BrowserRenderInput,
  BrowserScrapeInput,
  BrowserScrapeResult,
  BrowserScreenshotInput,
  BrowserSessionSummary,
  BrowserSnapshotResult,
  CheckVerificationInput,
  CreateVideoFromUrlInput,
  CreateVideoUploadInput,
  CreateVideoWatermarkInput,
  EmailMessageSummary,
  GenerateVideoCaptionInput,
  MintRealtimeTokenInput,
  MintVideoSignedTokenInput,
  OpenBrowserSessionInput,
  PhoneNumberSummary,
  PublishRealtimeBatchInput,
  PublishRealtimeMessageInput,
  RealtimeMessageSummary,
  RealtimePresenceMember,
  RealtimeTokenSummary,
  RunBrowserCommandsInput,
  RunBrowserCommandsResult,
  SendEmailInput,
  SendSmsInput,
  SmsMessageSummary,
  StartBrowserCrawlInput,
  StartBrowserCrawlResult,
  StartVerificationInput,
  UpdateVideoInput,
  UploadVideoCaptionInput,
  VaultDecryptResult,
  VaultEncryptResult,
  VaultGenerateDataKeyResult,
  VaultSecretSummary,
  VaultSecretValue,
  VaultSummary,
  VaultUnwrapResult,
  VerificationAttemptSummary,
  VerificationCheckResult,
  VideoCaptionSummary,
  VideoSignedToken,
  VideoSummary,
  VideoUploadTicket,
  VideoWatermarkProfileSummary,
  VoyantCloudClientOptions,
} from "./types.js";

interface CloudflareBrowserResultEnvelope<T> {
  success?: boolean;
  result?: T;
  errors?: Array<{ message: string }>;
}

function unwrapBrowserResult<T>(
  envelope: CloudflareBrowserResultEnvelope<T>,
): T {
  if (
    envelope &&
    typeof envelope === "object" &&
    "result" in envelope &&
    envelope.result !== undefined
  ) {
    return envelope.result as T;
  }
  return envelope as unknown as T;
}

export class VoyantCloudClient {
  readonly transport: VoyantTransport;

  constructor(options: VoyantCloudClientOptions) {
    this.transport = new VoyantTransport(options);
  }

  readonly vault = {
    getSecret: (vaultSlug: string, key: string) =>
      this.transport.request<VaultSecretValue>(
        `/vault/v1/${vaultSlug}/secrets/${key}`,
      ),
    listSecrets: (vaultSlug: string) =>
      this.transport.request<VaultSecretSummary[]>(
        `/vault/v1/${vaultSlug}/secrets`,
      ),
    listVaults: () => this.transport.request<VaultSummary[]>("/vault/v1"),
    encrypt: (vaultSlug: string, plaintext: string) =>
      this.transport.request<VaultEncryptResult>(
        `/vault/v1/${vaultSlug}/encrypt`,
        { body: { plaintext }, method: "POST" },
      ),
    decrypt: (vaultSlug: string, ciphertext: string) =>
      this.transport.request<VaultDecryptResult>(
        `/vault/v1/${vaultSlug}/decrypt`,
        { body: { ciphertext }, method: "POST" },
      ),
    generateDataKey: (vaultSlug: string) =>
      this.transport.request<VaultGenerateDataKeyResult>(
        `/vault/v1/${vaultSlug}/generateDataKey`,
        { method: "POST" },
      ),
    unwrap: (vaultSlug: string, wrappedDek: string) =>
      this.transport.request<VaultUnwrapResult>(
        `/vault/v1/${vaultSlug}/unwrap`,
        { body: { wrappedDek }, method: "POST" },
      ),
  };

  readonly sms = {
    listMessages: () =>
      this.transport.request<SmsMessageSummary[]>("/sms/v1/messages"),
    listPhoneNumbers: () =>
      this.transport.request<PhoneNumberSummary[]>("/sms/v1/phone-numbers"),
    sendMessage: (input: SendSmsInput) =>
      this.transport.request<SmsMessageSummary>("/sms/v1/messages", {
        body: input,
        method: "POST",
      }),
  };

  readonly verification = {
    check: (input: CheckVerificationInput) =>
      this.transport.request<VerificationCheckResult>("/verify/v1/check", {
        body: input,
        method: "POST",
      }),
    listAttempts: () =>
      this.transport.request<VerificationAttemptSummary[]>(
        "/verify/v1/attempts",
      ),
    start: (input: StartVerificationInput) =>
      this.transport.request<VerificationAttemptSummary>("/verify/v1/start", {
        body: input,
        method: "POST",
      }),
  };

  readonly email = {
    getMessage: (id: string) =>
      this.transport.request<EmailMessageSummary>(`/email/v1/messages/${id}`),
    listMessages: () =>
      this.transport.request<EmailMessageSummary[]>("/email/v1/messages"),
    sendMessage: (input: SendEmailInput) =>
      this.transport.request<EmailMessageSummary>("/email/v1/messages", {
        body: input,
        method: "POST",
      }),
  };

  readonly video = {
    videos: {
      list: () => this.transport.request<VideoSummary[]>("/video/v1/videos"),
      get: (videoId: string) =>
        this.transport.request<VideoSummary>(`/video/v1/videos/${videoId}`),
      createUpload: (input: CreateVideoUploadInput) =>
        this.transport.request<VideoUploadTicket>("/video/v1/videos/upload", {
          body: input,
          method: "POST",
        }),
      createFromUrl: (input: CreateVideoFromUrlInput) =>
        this.transport.request<VideoSummary>("/video/v1/videos/from-url", {
          body: input,
          method: "POST",
        }),
      update: (videoId: string, input: UpdateVideoInput) =>
        this.transport.request<VideoSummary>(`/video/v1/videos/${videoId}`, {
          body: input,
          method: "PATCH",
        }),
      delete: (videoId: string) =>
        this.transport.request<null>(`/video/v1/videos/${videoId}`, {
          method: "DELETE",
          responseType: "text",
        }),
      enableDownload: (videoId: string) =>
        this.transport.request<VideoSummary>(
          `/video/v1/videos/${videoId}/downloads`,
          { method: "POST" },
        ),
      mintToken: (videoId: string, input: MintVideoSignedTokenInput = {}) =>
        this.transport.request<VideoSignedToken>(
          `/video/v1/videos/${videoId}/token`,
          {
            body: input,
            method: "POST",
          },
        ),
      captions: {
        list: (videoId: string) =>
          this.transport.request<VideoCaptionSummary[]>(
            `/video/v1/videos/${videoId}/captions`,
          ),
        upload: (videoId: string, input: UploadVideoCaptionInput) =>
          this.transport.request<VideoCaptionSummary>(
            `/video/v1/videos/${videoId}/captions`,
            {
              body: input,
              method: "POST",
            },
          ),
        generate: (videoId: string, input: GenerateVideoCaptionInput) =>
          this.transport.request<VideoCaptionSummary>(
            `/video/v1/videos/${videoId}/captions/generate`,
            {
              body: input,
              method: "POST",
            },
          ),
        delete: (videoId: string, language: string) =>
          this.transport.request<null>(
            `/video/v1/videos/${videoId}/captions/${language}`,
            {
              method: "DELETE",
              responseType: "text",
            },
          ),
      },
    },
    watermarks: {
      list: () =>
        this.transport.request<VideoWatermarkProfileSummary[]>(
          "/video/v1/watermarks",
        ),
      create: (input: CreateVideoWatermarkInput) =>
        this.transport.request<VideoWatermarkProfileSummary>(
          "/video/v1/watermarks",
          {
            body: input,
            method: "POST",
          },
        ),
      delete: (watermarkProfileId: string) =>
        this.transport.request<null>(
          `/video/v1/watermarks/${watermarkProfileId}`,
          {
            method: "DELETE",
            responseType: "text",
          },
        ),
    },
  };

  readonly browser = {
    content: async (input: BrowserRenderInput) => {
      const envelope = await this.transport.request<
        CloudflareBrowserResultEnvelope<string>
      >("/browser/v1/content", {
        body: input,
        method: "POST",
        unwrapData: false,
      });
      return unwrapBrowserResult<string>(envelope);
    },
    markdown: async (input: BrowserRenderInput) => {
      const envelope = await this.transport.request<
        CloudflareBrowserResultEnvelope<string>
      >("/browser/v1/markdown", {
        body: input,
        method: "POST",
        unwrapData: false,
      });
      return unwrapBrowserResult<string>(envelope);
    },
    snapshot: async (input: BrowserRenderInput) => {
      const envelope = await this.transport.request<
        CloudflareBrowserResultEnvelope<BrowserSnapshotResult>
      >("/browser/v1/snapshot", {
        body: input,
        method: "POST",
        unwrapData: false,
      });
      return unwrapBrowserResult<BrowserSnapshotResult>(envelope);
    },
    scrape: async (input: BrowserScrapeInput) => {
      const envelope = await this.transport.request<
        CloudflareBrowserResultEnvelope<BrowserScrapeResult["results"]>
      >("/browser/v1/scrape", {
        body: input,
        method: "POST",
        unwrapData: false,
      });
      return unwrapBrowserResult<BrowserScrapeResult["results"]>(envelope);
    },
    links: async (input: BrowserRenderInput) => {
      const envelope = await this.transport.request<
        CloudflareBrowserResultEnvelope<BrowserLink[] | string[]>
      >("/browser/v1/links", {
        body: input,
        method: "POST",
        unwrapData: false,
      });
      return unwrapBrowserResult<BrowserLink[] | string[]>(envelope);
    },
    json: async <T = unknown>(input: BrowserJsonInput) => {
      const envelope = await this.transport.request<
        CloudflareBrowserResultEnvelope<T>
      >("/browser/v1/json", {
        body: input,
        method: "POST",
        unwrapData: false,
      });
      return unwrapBrowserResult<T>(envelope);
    },
    screenshot: (input: BrowserScreenshotInput) =>
      this.transport.request<Uint8Array>("/browser/v1/screenshot", {
        body: input,
        method: "POST",
        responseType: "binary",
      }),
    pdf: (input: BrowserPdfInput) =>
      this.transport.request<Uint8Array>("/browser/v1/pdf", {
        body: input,
        method: "POST",
        responseType: "binary",
      }),
    crawls: {
      start: (input: StartBrowserCrawlInput) =>
        this.transport.request<StartBrowserCrawlResult>("/browser/v1/crawl", {
          body: input,
          method: "POST",
          unwrapData: false,
        }),
      get: (id: string) =>
        this.transport.request<BrowserCrawlSummary>(`/browser/v1/crawl/${id}`, {
          unwrapData: false,
        }),
      cancel: (id: string) =>
        this.transport.request<null>(`/browser/v1/crawl/${id}`, {
          method: "DELETE",
          responseType: "text",
        }),
    },
    sessions: {
      open: (input: OpenBrowserSessionInput = {}) =>
        this.transport.request<BrowserSessionSummary>("/browser/v1/sessions", {
          body: input,
          method: "POST",
        }),
      list: () =>
        this.transport.request<BrowserSessionSummary[]>("/browser/v1/sessions"),
      get: (id: string) =>
        this.transport.request<BrowserSessionSummary>(
          `/browser/v1/sessions/${id}`,
        ),
      runCommands: (id: string, input: RunBrowserCommandsInput) =>
        this.transport.request<RunBrowserCommandsResult>(
          `/browser/v1/sessions/${id}/commands`,
          {
            body: input,
            method: "POST",
          },
        ),
      close: (id: string) =>
        this.transport.request<BrowserSessionSummary>(
          `/browser/v1/sessions/${id}`,
          {
            method: "DELETE",
          },
        ),
    },
  };

  readonly realtime = {
    publish: (channel: string, input: PublishRealtimeMessageInput) =>
      this.transport.request<RealtimeMessageSummary>(
        `/realtime/v1/channels/${channel}/messages`,
        {
          body: input,
          method: "POST",
        },
      ),
    publishBatch: (input: PublishRealtimeBatchInput) =>
      this.transport.request<RealtimeMessageSummary[]>(
        "/realtime/v1/messages",
        {
          body: input,
          method: "POST",
        },
      ),
    history: (channel: string, query?: { limit?: number; sinceId?: string }) =>
      this.transport.request<RealtimeMessageSummary[]>(
        `/realtime/v1/channels/${channel}/messages`,
        { query },
      ),
    presence: {
      get: (channel: string) =>
        this.transport.request<RealtimePresenceMember[]>(
          `/realtime/v1/channels/${channel}/presence`,
        ),
    },
    tokens: {
      mint: (input: MintRealtimeTokenInput) =>
        this.transport.request<RealtimeTokenSummary>("/realtime/v1/tokens", {
          body: input,
          method: "POST",
        }),
    },
  };
}

export function createVoyantCloudClient(options: VoyantCloudClientOptions) {
  return new VoyantCloudClient(options);
}
