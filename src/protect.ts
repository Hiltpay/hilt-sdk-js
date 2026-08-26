import { HiltApiError, HiltClient } from "./client.js";
import type {
  HiltAccessEntitlementConsumeResponse,
  HiltAccessX402SettleResponse,
  HiltJsonValue,
} from "./types.js";
import {
  getHiltPaymentSessionId,
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_RESPONSE_HEADER,
  PAYMENT_SIGNATURE_HEADER,
} from "./x402.js";

const DEFAULT_CUSTOMER_HEADERS = ["X-Hilt-Customer-Id", "X-Customer-Id", "X-Agent-Id"];
const DEFAULT_REQUEST_HEADERS = ["Idempotency-Key", "X-Request-Id", "X-Hilt-Request-Id"];
const PAYMENT_REQUIRED_CODES = new Set([
  "entitlement_not_found",
  "entitlement_not_active",
  "usage_balance_insufficient",
]);

export interface ProtectedEndpointContext {
  customerId: string;
  requestId: string;
  usage: HiltAccessEntitlementConsumeResponse;
  settlement?: HiltAccessX402SettleResponse;
}

export interface ProtectEndpointOptions {
  client: HiltClient;
  externalProductId: string;
  handler: (
    request: Request,
    context: ProtectedEndpointContext,
  ) => Response | Promise<Response>;
  units?: number;
  getCustomerId?: (request: Request) => string | null | undefined | Promise<string | null | undefined>;
  getRequestId?: (request: Request) => string | null | undefined | Promise<string | null | undefined>;
  resourceDescription?: string;
  resourceMimeType?: string;
  metadata?: Record<string, HiltJsonValue> | ((request: Request) => Record<string, HiltJsonValue>);
}

function firstHeader(request: Request, names: string[]): string | undefined {
  for (const name of names) {
    const value = request.headers.get(name)?.trim();
    if (value) return value;
  }
  return undefined;
}

function isPaymentRequired(error: unknown): boolean {
  return (
    error instanceof HiltApiError &&
    (error.statusCode === 404 || error.statusCode === 409) &&
    PAYMENT_REQUIRED_CODES.has(error.errorCode ?? "")
  );
}

function paymentRequiredHeader(paymentRequirement: HiltJsonValue | null | undefined): string {
  if (!paymentRequirement || typeof paymentRequirement !== "object" || Array.isArray(paymentRequirement)) {
    throw new Error("Hilt did not return an x402 payment requirement.");
  }
  const headers = paymentRequirement.headers;
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
    throw new Error("Hilt payment requirement did not contain headers.");
  }
  const value = headers[PAYMENT_REQUIRED_HEADER];
  if (typeof value !== "string" || !value) {
    throw new Error("Hilt payment requirement did not contain PAYMENT-REQUIRED.");
  }
  return value;
}

function withPaymentResponse(response: Response, paymentResponse: string | undefined): Response {
  if (!paymentResponse) return response;
  const headers = new Headers(response.headers);
  headers.set(PAYMENT_RESPONSE_HEADER, paymentResponse);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Protects a Fetch-compatible request handler with Hilt Pay API metered access.
 * The wrapped handler runs only after one usage unit has been consumed.
 */
export function protectEndpoint(
  options: ProtectEndpointOptions,
): (request: Request) => Promise<Response> {
  const externalProductId = options.externalProductId.trim();
  const units = options.units ?? 1;
  if (!externalProductId) {
    throw new Error("protectEndpoint requires externalProductId.");
  }
  if (!Number.isInteger(units) || units < 1) {
    throw new Error("protectEndpoint units must be a positive integer.");
  }

  return async (request: Request): Promise<Response> => {
    const customerId = (
      await options.getCustomerId?.(request) ?? firstHeader(request, DEFAULT_CUSTOMER_HEADERS)
    )?.trim();
    const requestId = (
      await options.getRequestId?.(request) ?? firstHeader(request, DEFAULT_REQUEST_HEADERS)
    )?.trim();

    if (!customerId || !requestId) {
      return Response.json(
        {
          error: "request_identity_required",
          message: "Send a stable customer ID and request ID with each billable request.",
          required_headers: {
            customer: DEFAULT_CUSTOMER_HEADERS,
            request: DEFAULT_REQUEST_HEADERS,
          },
        },
        { status: 400 },
      );
    }
    if (requestId.length < 8 || requestId.length > 240) {
      return Response.json(
        {
          error: "request_id_invalid",
          message: "The request ID must contain 8 to 240 characters for retry-safe processing.",
        },
        { status: 400 },
      );
    }

    const paymentSignature = request.headers.get(PAYMENT_SIGNATURE_HEADER)?.trim();
    let settlement: HiltAccessX402SettleResponse | undefined;
    if (paymentSignature) {
      let paymentSessionId: string;
      try {
        paymentSessionId = getHiltPaymentSessionId(paymentSignature);
      } catch {
        return Response.json(
          {
            error: "payment_signature_invalid",
            message: "PAYMENT-SIGNATURE is not a Hilt-bound x402 payment payload.",
          },
          { status: 400 },
        );
      }
      settlement = await options.client.payApi.settleX402(
        {
          payment_session_id: paymentSessionId,
          payment_signature: paymentSignature,
        },
        { idempotencyKey: `settle-${requestId}` },
      );
    }

    let usage: HiltAccessEntitlementConsumeResponse;
    try {
      usage = await options.client.payApi.consumeEntitlement(
        {
          external_product_id: externalProductId,
          external_customer_id: customerId,
          units,
          metadata: { request_id: requestId },
        },
        { idempotencyKey: `consume-${requestId}` },
      );
    } catch (error) {
      if (!isPaymentRequired(error)) throw error;

      if (settlement) {
        return Response.json(
          {
            error: "usage_not_ready",
            message: "Payment settled, but usage is not ready. Retry with the same request ID and PAYMENT-SIGNATURE.",
            request_id: requestId,
          },
          {
            status: 409,
            headers: {
              [PAYMENT_RESPONSE_HEADER]: settlement.headers[PAYMENT_RESPONSE_HEADER],
              "X-Hilt-Request-Id": requestId,
            },
          },
        );
      }

      const configuredMetadata = typeof options.metadata === "function"
        ? options.metadata(request)
        : options.metadata ?? {};
      const session = await options.client.payApi.createPaymentSession(
        {
          external_product_id: externalProductId,
          external_customer_id: customerId,
          payment_protocol: "x402",
          settlement_rail: "solana_usdc",
          metadata: {
            ...configuredMetadata,
            resource: request.url,
            description: options.resourceDescription ?? "Paid endpoint request",
            mime_type: options.resourceMimeType ?? "application/json",
          },
        },
        { idempotencyKey: `payment-${requestId}` },
      );

      return Response.json(
        {
          error: "payment_required",
          external_product_id: externalProductId,
          request_id: requestId,
        },
        {
          status: 402,
          headers: {
            [PAYMENT_REQUIRED_HEADER]: paymentRequiredHeader(
              session.payment_session?.payment_requirement,
            ),
            "X-Hilt-Request-Id": requestId,
          },
        },
      );
    }

    if (!usage.consumed) {
      throw new Error("Hilt did not confirm atomic usage consumption.");
    }

    const response = await options.handler(request, {
      customerId,
      requestId,
      usage,
      settlement,
    });
    return withPaymentResponse(
      response,
      settlement?.headers[PAYMENT_RESPONSE_HEADER],
    );
  };
}
