import { HILT_ERROR_CODES, HiltError } from "./errors.js";

export interface HiltWebhookEvent<Data = Record<string, unknown>> {
  id: string;
  type: string;
  api_version?: string;
  created_at?: string;
  livemode?: boolean;
  data: Data;
  [key: string]: unknown;
}

export type HiltWebhookRawBody = string | ArrayBuffer | Uint8Array;

export interface HiltWebhookVerificationOptions {
  toleranceSeconds?: number;
  now?: Date | number;
}

export type HiltWebhookHandler<Event extends HiltWebhookEvent = HiltWebhookEvent> = (
  event: Event,
) => void | Promise<void>;

function rawBodyToText(rawBody: HiltWebhookRawBody): string {
  if (typeof rawBody === "string") {
    return rawBody;
  }
  if (rawBody instanceof Uint8Array) {
    return new TextDecoder().decode(rawBody);
  }
  return new TextDecoder().decode(new Uint8Array(rawBody));
}

function parseSignatureHeader(signatureHeader: string | null | undefined): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const chunk of (signatureHeader ?? "").split(",")) {
    const item = chunk.trim();
    if (!item) {
      continue;
    }
    const separator = item.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    parts[item.slice(0, separator)] = item.slice(separator + 1);
  }
  return parts;
}

function nowSeconds(now: Date | number | undefined): number {
  if (typeof now === "number") {
    return now > 10_000_000_000 ? Math.floor(now / 1000) : Math.floor(now);
  }
  return Math.floor((now ?? new Date()).getTime() / 1000);
}

function timingSafeEqualHex(left: string, right: string): boolean {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const leftCode = index < a.length ? a.charCodeAt(index) : 0;
    const rightCode = index < b.length ? b.charCodeAt(index) : 0;
    diff |= leftCode ^ rightCode;
  }
  return diff === 0;
}

async function hmacSha256Hex(signingSecret: string, payload: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new HiltError({
      code: HILT_ERROR_CODES.webhookSignatureFailed,
      message: "Web Crypto is required to verify Hilt webhook signatures.",
      retryable: false,
      docsUrl: "https://docs.hilt.so/developers/webhooks#signature-verification",
    });
  }

  const encoder = new TextEncoder();
  const key = await subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyWebhookSignature(
  rawBody: HiltWebhookRawBody,
  signatureHeader: string | null | undefined,
  signingSecret: string,
  options: HiltWebhookVerificationOptions = {},
): Promise<void> {
  const parts = parseSignatureHeader(signatureHeader);
  const timestamp = Number.parseInt(parts.t ?? "", 10);
  const received = parts.v1;

  if (!Number.isFinite(timestamp) || !received) {
    throw new HiltError({
      code: HILT_ERROR_CODES.webhookSignatureFailed,
      message: "Malformed Hilt webhook signature header.",
      statusCode: 400,
      retryable: false,
      docsUrl: "https://docs.hilt.so/developers/webhooks#signature-verification",
    });
  }

  const toleranceSeconds = options.toleranceSeconds ?? 300;
  if (toleranceSeconds > 0 && Math.abs(nowSeconds(options.now) - timestamp) > toleranceSeconds) {
    throw new HiltError({
      code: HILT_ERROR_CODES.webhookSignatureFailed,
      message: "Stale Hilt webhook signature timestamp.",
      statusCode: 400,
      retryable: false,
      docsUrl: "https://docs.hilt.so/developers/webhooks#signature-verification",
    });
  }

  const rawBodyText = rawBodyToText(rawBody);
  const expected = await hmacSha256Hex(signingSecret, `${timestamp}.${rawBodyText}`);
  if (!timingSafeEqualHex(expected, received)) {
    throw new HiltError({
      code: HILT_ERROR_CODES.webhookSignatureFailed,
      message: "Invalid Hilt webhook signature.",
      statusCode: 400,
      retryable: false,
      docsUrl: "https://docs.hilt.so/developers/webhooks#signature-verification",
    });
  }
}

export async function constructWebhookEvent<Data = Record<string, unknown>>(
  rawBody: HiltWebhookRawBody,
  signatureHeader: string | null | undefined,
  signingSecret: string,
  options: HiltWebhookVerificationOptions = {},
): Promise<HiltWebhookEvent<Data>> {
  await verifyWebhookSignature(rawBody, signatureHeader, signingSecret, options);
  const rawBodyText = rawBodyToText(rawBody);
  try {
    return JSON.parse(rawBodyText) as HiltWebhookEvent<Data>;
  } catch (error) {
    throw new HiltError({
      code: "invalid_webhook_payload",
      message: "Hilt webhook payload was not valid JSON.",
      statusCode: 400,
      retryable: false,
      docsUrl: "https://docs.hilt.so/developers/webhooks#payload-shape",
      body: rawBodyText,
      cause: error,
    });
  }
}

export class HiltWebhookRouter {
  private readonly handlers = new Map<string, HiltWebhookHandler[]>();

  on<Event extends HiltWebhookEvent = HiltWebhookEvent>(
    eventType: Event["type"] | "*",
    handler: HiltWebhookHandler<Event>,
  ): this {
    const handlers = this.handlers.get(eventType) ?? [];
    handlers.push(handler as HiltWebhookHandler);
    this.handlers.set(eventType, handlers);
    return this;
  }

  async dispatch<Event extends HiltWebhookEvent = HiltWebhookEvent>(event: Event): Promise<void> {
    const handlers = [
      ...(this.handlers.get(event.type) ?? []),
      ...(this.handlers.get("*") ?? []),
    ];
    for (const handler of handlers) {
      await handler(event);
    }
  }
}

export function createWebhookRouter(): HiltWebhookRouter {
  return new HiltWebhookRouter();
}
