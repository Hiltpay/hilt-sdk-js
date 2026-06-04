export const HILT_ERROR_CODES = {
  paymentFailed: "payment_failed",
  subscriptionExpired: "subscription_expired",
  invalidAuthorization: "invalid_authorization",
  webhookSignatureFailed: "webhook_signature_failed",
  invalidIdempotencyKey: "invalid_idempotency_key",
  idempotencyKeyRequired: "idempotency_key_required",
  idempotencyKeyTooLong: "idempotency_key_too_long",
  idempotencyKeyInvalid: "idempotency_key_invalid",
  idempotencyInProgress: "idempotency_in_progress",
  idempotencyConflict: "idempotency_conflict",
  idempotencyRace: "idempotency_race",
  rateLimited: "rate_limited",
  setupNotReady: "setup_not_ready",
  entitlementMissing: "entitlement_missing",
  subscriptionCancelled: "subscription_cancelled",
  subscriptionRequiresReapproval: "subscription_requires_reapproval",
  requestTimeout: "request_timeout",
} as const;

export type HiltErrorCode = (typeof HILT_ERROR_CODES)[keyof typeof HILT_ERROR_CODES] | string;

export interface HiltRawResponseDetails {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface HiltErrorOptions {
  code?: HiltErrorCode;
  message: string;
  statusCode?: number;
  requestId?: string;
  retryable?: boolean;
  docsUrl?: string;
  body?: unknown;
  rawResponse?: HiltRawResponseDetails;
  cause?: unknown;
}

export class HiltError extends Error {
  readonly code?: HiltErrorCode;
  readonly statusCode?: number;
  readonly requestId?: string;
  readonly retryable: boolean;
  readonly docsUrl?: string;
  readonly body?: unknown;
  readonly rawResponse?: HiltRawResponseDetails;

  constructor(options: HiltErrorOptions) {
    super(options.message);
    this.name = "HiltError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.requestId = options.requestId;
    this.retryable = options.retryable ?? false;
    this.docsUrl = options.docsUrl;
    this.body = options.body;
    this.rawResponse = options.rawResponse;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export interface HiltApiErrorOptions {
  requestId?: string;
  retryable?: boolean;
  docsUrl?: string;
  rawResponse?: HiltRawResponseDetails;
}

export class HiltApiError extends HiltError {
  readonly errorCode?: HiltErrorCode;
  readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    errorCode?: HiltErrorCode,
    details?: unknown,
    options: HiltApiErrorOptions = {},
  ) {
    super({
      code: errorCode,
      message,
      statusCode,
      requestId: options.requestId,
      retryable: options.retryable,
      docsUrl: options.docsUrl,
      body: details,
      rawResponse: options.rawResponse,
    });
    this.name = "HiltApiError";
    this.errorCode = errorCode;
    this.details = details;
  }
}
