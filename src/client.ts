import type {
  AddSupportMessageInput,
  AccessAppCreateInput,
  AccessAgentBootstrapInput,
  AccessAgentSetupApproveResponse,
  AccessAgentSetupApproveInput,
  AccessAgentSetupManifestInput,
  AccessAgentSetupResponse,
  AccessAgentSetupStatusInput,
  AccessEntitlementCheckInput,
  AccessEntitlementConsumeInput,
  AccessPaymentProofSubmitInput,
  AccessPaymentSessionCreateInput,
  AccessX402SettleInput,
  AccessSandboxPaymentSessionConfirmInput,
  AccessSandboxPaymentSessionCreateInput,
  AccessNativeSubscriptionCancelConfirmInput,
  AccessNativeSubscriptionCancelIntentInput,
  AccessProductAvailableRailsByIdParams,
  AccessProductAvailableRailsParams,
  AccessProductCreateInput,
  AccessRailSettingUpdateInput,
  AccessSetupReadinessParams,
  AccessWebhookCreateInput,
  BroadcastPaymentInput,
  CheckoutHandoffCreateInput,
  CheckoutHandoffResolveInput,
  ConfirmPaymentInput,
  ConnectCheckoutInput,
  CreateProductInput,
  CreateSupportTicketInput,
  HiltAccessApp,
  HiltAccessEntitlementCheckResponse,
  HiltAccessEntitlementConsumeResponse,
  HiltAccessNativeSubscription,
  HiltAccessNativeSubscriptionCancelConfirmResponse,
  HiltAccessNativeSubscriptionCancelIntentResponse,
  HiltAccessPaymentSessionResponse,
  HiltAccessX402SettleResponse,
  HiltAccessProduct,
  HiltAccessRail,
  HiltAccessSandboxPaymentSessionResponse,
  HiltClientOptions,
  HiltIdempotencyOptions,
  HiltMembership,
  HiltMembershipListResponse,
  HiltPayment,
  HiltProduct,
  HiltReceiptDetail,
  HiltReceiptsResponse,
  HiltRequestOptions,
  HiltSupportTicket,
  HiltSupportTicketListResponse,
  HiltWebhookDeliveriesResponse,
  HiltWebhookEndpoint,
  HiltWebhookEndpointsResponse,
  HiltWebhookEventsResponse,
  HiltWebhookTimelineResponse,
  ListMembershipsParams,
  ListReceiptsParams,
  ListSupportTicketsParams,
  LookupMembershipsParams,
  MembershipGiftInput,
  MembershipNotesInput,
  MembershipProfileInput,
  QueryValue,
  ReceiptCreateInput,
  ReceiptInvoiceMetadataInput,
  ReceiptSendProofInput,
  RenewalIntelligenceParams,
  UpdateProductInput,
  WebhookDeliveriesParams,
  WebhookEndpointCreateInput,
  WebhookEndpointUpdateInput,
  WebhookEventsParams,
  WebhookTimelineParams,
} from "./types.js";
import { HILT_ERROR_CODES, HiltApiError, HiltError } from "./errors.js";

export { HiltApiError, HiltError } from "./errors.js";

function normalizeBaseUrl(value: string | undefined): string {
  const fallback = "https://api.hilt.so";
  const candidate = (value || fallback).trim();
  return candidate.replace(/\/+$/, "") || fallback;
}

function appendQuery(url: URL, query: Record<string, QueryValue> | undefined) {
  if (!query) return;
  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }
    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        url.searchParams.append(key, String(value));
      }
      continue;
    }
    url.searchParams.set(key, String(rawValue));
  }
}

function asQuery<T extends object | undefined>(value: T): Record<string, QueryValue> | undefined {
  return value as Record<string, QueryValue> | undefined;
}

type AuthMode = NonNullable<HiltRequestOptions["auth"]>;
type IdempotencyInput = string | HiltIdempotencyOptions;

function resolveIdempotencyKey(value: IdempotencyInput): string {
  return typeof value === "string" ? value : value.idempotencyKey;
}

function idempotencyHeaders(idempotencyKey: IdempotencyInput): Record<string, string> {
  const normalized = resolveIdempotencyKey(idempotencyKey).trim();
  if (normalized.length < 8) {
    throw new HiltError({
      code: HILT_ERROR_CODES.idempotencyKeyRequired,
      message: "Write requests require an Idempotency-Key header of at least 8 characters.",
      statusCode: 400,
      retryable: false,
      docsUrl: docsUrlForCode(HILT_ERROR_CODES.idempotencyKeyRequired),
    });
  }
  if (normalized.length > 255) {
    throw new HiltError({
      code: HILT_ERROR_CODES.idempotencyKeyTooLong,
      message: "Idempotency-Key must be 255 characters or fewer.",
      statusCode: 400,
      retryable: false,
      docsUrl: docsUrlForCode(HILT_ERROR_CODES.idempotencyKeyTooLong),
    });
  }
  if ([...normalized].some((char) => {
    const code = char.charCodeAt(0);
    return code < 33 || code === 127 || code > 126;
  })) {
    throw new HiltError({
      code: HILT_ERROR_CODES.idempotencyKeyInvalid,
      message: "Idempotency-Key must be visible ASCII without whitespace.",
      statusCode: 400,
      retryable: false,
      docsUrl: docsUrlForCode(HILT_ERROR_CODES.idempotencyKeyInvalid),
    });
  }
  return { "Idempotency-Key": normalized };
}

const SAFE_RESPONSE_HEADERS = [
  "content-type",
  "retry-after",
  "x-request-id",
  "x-hilt-request-id",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
];

function safeResponseHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of SAFE_RESPONSE_HEADERS) {
    const value = headers.get(name);
    if (value) {
      result[name] = value;
    }
  }
  return result;
}

function requestIdFromHeaders(headers: Headers): string | undefined {
  return (
    headers.get("x-hilt-request-id") ??
    headers.get("x-request-id") ??
    headers.get("request-id") ??
    undefined
  );
}

function docsUrlForCode(code: string | undefined): string | undefined {
  if (!code) {
    return undefined;
  }
  return `https://docs.hilt.so/developers/errors#${code.replace(/_/g, "-")}`;
}

function valueAsRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function stringField(data: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!data) {
    return undefined;
  }
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
}

function retryableFrom(statusCode: number, code: string | undefined, payload: unknown): boolean {
  const data = valueAsRecord(payload);
  if (typeof data?.retryable === "boolean") {
    return data.retryable;
  }
  if (code === HILT_ERROR_CODES.idempotencyConflict) {
    return false;
  }
  if (
    code === HILT_ERROR_CODES.rateLimited ||
    code === HILT_ERROR_CODES.idempotencyInProgress ||
    code === HILT_ERROR_CODES.idempotencyRace
  ) {
    return true;
  }
  return statusCode === 408 || statusCode === 409 || statusCode === 425 || statusCode === 429 || statusCode >= 500;
}

export class HiltClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly bearerToken?: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly userAgent: string;

  constructor(options: HiltClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.apiKey = options.apiKey?.trim() || undefined;
    this.bearerToken = options.bearerToken?.trim() || undefined;
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.userAgent = options.userAgent ?? "hilt-typescript-sdk/1.4.0";

    if (typeof this.fetchImpl !== "function") {
      throw new Error("HiltClient requires fetch. Pass a custom fetch implementation if your runtime does not expose one.");
    }
  }

  readonly products = {
    create: (body: CreateProductInput) =>
      this.request<HiltProduct>("/v1/products", { method: "POST", body }),
    list: () => this.request<HiltProduct[]>("/v1/products"),
    get: (productId: string) =>
      this.request<HiltProduct>(`/v1/products/${productId}`),
    update: (productId: string, body: UpdateProductInput) =>
      this.request<HiltProduct>(`/v1/products/${productId}`, { method: "PATCH", body }),
    archive: (productId: string) =>
      this.request<HiltProduct>(`/v1/products/${productId}`, { method: "DELETE" }),
    listPayments: (productId: string, query?: { status?: string; limit?: number; offset?: number }) =>
      this.request<HiltPayment[]>(`/v1/products/${productId}/payments`, { query }),
    getAnalytics: (productId: string) =>
      this.request<Record<string, unknown>>(`/v1/products/${productId}/analytics`),
    createHandoffLink: (productId: string, body: CheckoutHandoffCreateInput) =>
      this.request<Record<string, unknown>>(`/v1/products/${productId}/handoff-link`, {
        method: "POST",
        body,
      }),
  };

  readonly checkout = {
    getProduct: (slug: string) =>
      this.request<Record<string, unknown>>(`/v1/products/p/${slug}`, { auth: "none" }),
    connect: (slug: string, body: ConnectCheckoutInput) =>
      this.request<Record<string, unknown>>(`/v1/products/p/${slug}/connect`, {
        method: "POST",
        body,
        auth: "none",
      }),
    resolveHandoff: (slug: string, body: CheckoutHandoffResolveInput) =>
      this.request<Record<string, unknown>>(`/v1/products/p/${slug}/resolve-handoff`, {
        method: "POST",
        body,
        auth: "none",
      }),
    broadcastPayment: (body: BroadcastPaymentInput) =>
      this.request<Record<string, unknown>>("/v1/pay/broadcast", {
        method: "POST",
        body,
        auth: "none",
      }),
    confirmPayment: (body: ConfirmPaymentInput) =>
      this.request<Record<string, unknown>>("/v1/pay/confirm", {
        method: "POST",
        body,
        auth: "none",
      }),
  };

  readonly payments = {
    get: (paymentId: string) =>
      this.request<HiltPayment>(`/v1/payments/${paymentId}`, { auth: "none" }),
  };

  readonly access = {
    agentBootstrap: (body: AccessAgentBootstrapInput) =>
      this.request<AccessAgentSetupResponse>("/v1/access/agent-bootstrap", {
        method: "POST",
        body,
        auth: "none",
      }),
    getAgentSetupStatus: (setupIntentId: string, body: AccessAgentSetupStatusInput) =>
      this.request<AccessAgentSetupResponse>(`/v1/access/agent-bootstrap/${setupIntentId}/status`, {
        method: "POST",
        body,
        auth: "none",
      }),
    submitAgentSetupManifest: (setupIntentId: string, body: AccessAgentSetupManifestInput) =>
      this.request<AccessAgentSetupResponse>(`/v1/access/agent-bootstrap/${setupIntentId}/manifest`, {
        method: "POST",
        body,
        auth: "none",
      }),
    approveAgentSetup: (setupIntentId: string, body: AccessAgentSetupApproveInput) =>
      this.request<AccessAgentSetupApproveResponse>(`/v1/access/agent-bootstrap/${setupIntentId}/approve`, {
        method: "POST",
        body,
        auth: "bearer",
      }),
    listRails: () =>
      this.request<{ default_rail: string; rails: HiltAccessRail[] }>("/v1/access/rails"),
    listRailSettings: () =>
      this.request<Record<string, unknown>>("/v1/access/rail-settings"),
    updateRailSetting: (railId: string, body: AccessRailSettingUpdateInput, idempotencyKey: IdempotencyInput) =>
      this.request<Record<string, unknown>>(`/v1/access/rail-settings/${railId}`, {
        method: "PUT",
        body,
        headers: idempotencyHeaders(idempotencyKey),
      }),
    getSetupReadiness: (query?: AccessSetupReadinessParams) =>
      this.request<Record<string, unknown>>("/v1/access/setup/readiness", { query: asQuery(query) }),
    getProductAvailableRails: (query?: AccessProductAvailableRailsParams) =>
      this.request<Record<string, unknown>>("/v1/access/products/available-rails", { query: asQuery(query) }),
    getProductAvailableRailsById: (productId: string, query?: AccessProductAvailableRailsByIdParams) =>
      this.request<Record<string, unknown>>(`/v1/access/products/${productId}/available-rails`, {
        query: asQuery(query),
      }),
    getNativeSubscription: (authorizationId: string) =>
      this.request<HiltAccessNativeSubscription>(`/v1/access/native-subscriptions/${authorizationId}`),
    createNativeSubscriptionCancelIntent: (
      authorizationId: string,
      body: AccessNativeSubscriptionCancelIntentInput = {},
    ) =>
      this.request<HiltAccessNativeSubscriptionCancelIntentResponse>(
        `/v1/access/native-subscriptions/${authorizationId}/cancel-intent`,
        {
          method: "POST",
          body,
        },
      ),
    confirmNativeSubscriptionCancel: (
      authorizationId: string,
      body: AccessNativeSubscriptionCancelConfirmInput,
      idempotencyKey: IdempotencyInput,
    ) =>
      this.request<HiltAccessNativeSubscriptionCancelConfirmResponse>(
        `/v1/access/native-subscriptions/${authorizationId}/cancel-confirm`,
        {
          method: "POST",
          body,
          headers: idempotencyHeaders(idempotencyKey),
        },
      ),
    createApp: (body: AccessAppCreateInput, idempotencyKey: IdempotencyInput) =>
      this.request<{ app: HiltAccessApp; rail: HiltAccessRail }>("/v1/access/apps", {
        method: "POST",
        body,
        headers: idempotencyHeaders(idempotencyKey),
      }),
    createProduct: (body: AccessProductCreateInput, idempotencyKey: IdempotencyInput) =>
      this.request<{
        access_product: HiltAccessProduct;
        hilt_product: HiltProduct;
        rail: HiltAccessRail;
      }>("/v1/access/products", {
        method: "POST",
        body,
        headers: idempotencyHeaders(idempotencyKey),
      }),
    createPaymentSession: (body: AccessPaymentSessionCreateInput, idempotencyKey: IdempotencyInput) =>
      this.request<HiltAccessPaymentSessionResponse>("/v1/access/payment-sessions", {
        method: "POST",
        body,
        headers: idempotencyHeaders(idempotencyKey),
      }),
    createSandboxPaymentSession: (
      body: AccessSandboxPaymentSessionCreateInput,
      idempotencyKey: IdempotencyInput,
    ) =>
      this.request<HiltAccessSandboxPaymentSessionResponse>("/v1/access/sandbox/payment-sessions", {
        method: "POST",
        body,
        headers: idempotencyHeaders(idempotencyKey),
      }),
    confirmSandboxPaymentSession: (
      sandboxSessionId: string,
      body: AccessSandboxPaymentSessionConfirmInput,
      idempotencyKey: IdempotencyInput,
    ) =>
      this.request<HiltAccessSandboxPaymentSessionResponse>(`/v1/access/sandbox/payment-sessions/${sandboxSessionId}/confirm`, {
        method: "POST",
        body,
        headers: idempotencyHeaders(idempotencyKey),
      }),
    submitPaymentProof: (body: AccessPaymentProofSubmitInput, idempotencyKey: IdempotencyInput) =>
      this.request<Record<string, unknown>>("/v1/access/payment-proofs", {
        method: "POST",
        body,
        headers: idempotencyHeaders(idempotencyKey),
      }),
    checkEntitlement: (body: AccessEntitlementCheckInput) =>
      this.request<HiltAccessEntitlementCheckResponse>("/v1/access/entitlements/check", {
        method: "POST",
        body,
      }),
    consumeEntitlement: (body: AccessEntitlementConsumeInput, idempotencyKey: IdempotencyInput) =>
      this.request<HiltAccessEntitlementConsumeResponse>("/v1/access/entitlements/consume", {
        method: "POST",
        body,
        headers: idempotencyHeaders(idempotencyKey),
      }),
    settleX402: (body: AccessX402SettleInput, idempotencyKey: IdempotencyInput) =>
      this.request<HiltAccessX402SettleResponse>("/v1/access/x402/settle", {
        method: "POST",
        body,
        headers: idempotencyHeaders(idempotencyKey),
      }),
    getEntitlement: (entitlementId: string) =>
      this.request<Record<string, unknown>>(`/v1/access/entitlements/${entitlementId}`),
    createWebhook: (body: AccessWebhookCreateInput, idempotencyKey: IdempotencyInput) =>
      this.request<Record<string, unknown>>("/v1/access/webhooks", {
        method: "POST",
        body,
        headers: idempotencyHeaders(idempotencyKey),
      }),
  };

  readonly payApi = this.access;

  readonly memberships = {
    list: (query?: ListMembershipsParams) =>
      this.request<HiltMembershipListResponse>("/v1/memberships", { query: asQuery(query) }),
    lookup: (query?: LookupMembershipsParams) =>
      this.request<HiltMembershipListResponse>("/v1/memberships/lookup", { query: asQuery(query) }),
    get: (membershipId: string) =>
      this.request<HiltMembership>(`/v1/memberships/${membershipId}`),
    getRenewalIntelligence: (query?: RenewalIntelligenceParams) =>
      this.request<Record<string, unknown>>("/v1/memberships/renewal-intelligence", { query: asQuery(query) }),
    updateNotes: (membershipId: string, body: MembershipNotesInput) =>
      this.request<Record<string, unknown>>(`/v1/memberships/${membershipId}/notes`, {
        method: "PATCH",
        body,
      }),
    updateProfile: (membershipId: string, body: MembershipProfileInput) =>
      this.request<Record<string, unknown>>(`/v1/memberships/${membershipId}/profile`, {
        method: "PATCH",
        body,
      }),
    gift: (membershipId: string, body: MembershipGiftInput) =>
      this.request<Record<string, unknown>>(`/v1/memberships/${membershipId}/gift`, {
        method: "POST",
        body,
      }),
    retryDelivery: (membershipId: string) =>
      this.request<Record<string, unknown>>(`/v1/memberships/${membershipId}/retry-delivery`, {
        method: "POST",
      }),
    getDeliveryDiagnostics: (membershipId: string) =>
      this.request<Record<string, unknown>>(`/v1/memberships/${membershipId}/delivery-diagnostics`),
    openDeliverySupportTicket: (membershipId: string) =>
      this.request<Record<string, unknown>>(`/v1/memberships/${membershipId}/delivery-support-ticket`, {
        method: "POST",
      }),
    getReactivation: (membershipId: string) =>
      this.request<Record<string, unknown>>(`/v1/memberships/${membershipId}/reactivation`),
  };

  readonly receipts = {
    create: (body: ReceiptCreateInput) =>
      this.request<Record<string, unknown>>("/v1/receipt", { method: "POST", body }),
    list: (query?: ListReceiptsParams) =>
      this.request<HiltReceiptsResponse>("/v1/receipts", { query: asQuery(query) }),
    get: (receiptId: string) =>
      this.request<HiltReceiptDetail>(`/v1/receipt/${receiptId}`),
    getPublic: (receiptId: string) =>
      this.request<HiltReceiptDetail>(`/v1/receipt/${receiptId}/public`, { auth: "none" }),
    verify: (receiptId: string) =>
      this.request<Record<string, unknown>>(`/v1/receipt/${receiptId}/verify`, { auth: "none" }),
    getPdf: (receiptId: string) =>
      this.request<ArrayBuffer>(`/v1/receipt/${receiptId}/pdf`, {
        auth: "none",
        responseType: "arrayBuffer",
      }),
    updateInvoiceMetadata: (receiptId: string, body: ReceiptInvoiceMetadataInput) =>
      this.request<Record<string, unknown>>(`/v1/receipt/${receiptId}/invoice-metadata`, {
        method: "PATCH",
        body,
      }),
    sendProof: (receiptId: string, body: ReceiptSendProofInput) =>
      this.request<Record<string, unknown>>(`/v1/receipt/${receiptId}/send-proof`, {
        method: "POST",
        body,
      }),
  };

  readonly support = {
    createTicket: (body: CreateSupportTicketInput) =>
      this.request<{ ticket_id: string; status: string; subject: string; category: string }>(
        "/v1/support/tickets",
        {
          method: "POST",
          body,
        },
      ),
    listTickets: (query?: ListSupportTicketsParams) =>
      this.request<HiltSupportTicketListResponse>("/v1/support/tickets", { query: asQuery(query) }),
    getTicket: (ticketId: string) =>
      this.request<HiltSupportTicket & { messages?: Record<string, unknown>[] }>(
        `/v1/support/tickets/${ticketId}`,
      ),
    addMessage: (ticketId: string, body: AddSupportMessageInput) =>
      this.request<Record<string, unknown>>(`/v1/support/tickets/${ticketId}/message`, {
        method: "POST",
        body,
      }),
  };

  readonly webhooks = {
    listEndpoints: () =>
      this.request<HiltWebhookEndpointsResponse>("/v1/webhooks/endpoints", {
        auth: "bearer",
      }),
    createEndpoint: (body: WebhookEndpointCreateInput) =>
      this.request<{ endpoint: HiltWebhookEndpoint; signing_secret: string }>(
        "/v1/webhooks/endpoints",
        {
          method: "POST",
          body,
          auth: "bearer",
        },
      ),
    updateEndpoint: (endpointId: string, body: WebhookEndpointUpdateInput) =>
      this.request<{ endpoint: HiltWebhookEndpoint; signing_secret?: string }>(
        `/v1/webhooks/endpoints/${endpointId}`,
        {
          method: "PATCH",
          body,
          auth: "bearer",
        },
      ),
    disableEndpoint: (endpointId: string) =>
      this.request<{ endpoint: HiltWebhookEndpoint }>(`/v1/webhooks/endpoints/${endpointId}`, {
        method: "DELETE",
        auth: "bearer",
      }),
    sendTestEvent: (endpointId: string, eventType: string) =>
      this.request<Record<string, unknown>>(`/v1/webhooks/endpoints/${endpointId}/test`, {
        method: "POST",
        body: { event_type: eventType },
        auth: "bearer",
      }),
    listDeliveries: (query?: WebhookDeliveriesParams) =>
      this.request<HiltWebhookDeliveriesResponse>("/v1/webhooks/deliveries", {
        query: asQuery(query),
        auth: "bearer",
      }),
    replayDelivery: (deliveryId: number) =>
      this.request<Record<string, unknown>>(`/v1/webhooks/deliveries/${deliveryId}/replay`, {
        method: "POST",
        auth: "bearer",
      }),
    getTimeline: (query: WebhookTimelineParams) =>
      this.request<HiltWebhookTimelineResponse>("/v1/webhooks/timeline", {
        query: asQuery(query),
        auth: "bearer",
      }),
    listEvents: (query?: WebhookEventsParams) =>
      this.request<HiltWebhookEventsResponse>("/v1/webhooks/events", {
        query: asQuery(query),
        auth: "bearer",
      }),
  };

  async request<T>(path: string, options: HiltRequestOptions = {}): Promise<T> {
    const auth = options.auth ?? "merchant";
    const url = new URL(path, `${this.baseUrl}/`);
    appendQuery(url, options.query);

    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    headers.set("User-Agent", this.userAgent);
    if (options.idempotencyKey) {
      headers.set("Idempotency-Key", options.idempotencyKey.trim());
    }

    const authHeader = this.resolveAuthHeader(auth);
    if (authHeader) {
      headers.set(authHeader.name, authHeader.value);
    }

    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(options.body);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const signal = options.signal ?? controller.signal;

    try {
      const response = await this.fetchImpl(url, {
        method: options.method ?? (body ? "POST" : "GET"),
        headers,
        body,
        signal,
      });

      if (!response.ok) {
        throw await this.buildError(response);
      }

      switch (options.responseType) {
        case "text":
          return (await response.text()) as T;
        case "arrayBuffer":
          return (await response.arrayBuffer()) as T;
        case "raw":
          return response as T;
        default:
          if (response.status === 204) {
            return undefined as T;
          }
          return (await response.json()) as T;
      }
    } catch (error) {
      if (error instanceof HiltError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new HiltError({
          code: "request_timeout",
          message: `Hilt request timed out after ${this.timeoutMs}ms.`,
          retryable: true,
          docsUrl: "https://docs.hilt.so/developers/errors",
          cause: error,
        });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private resolveAuthHeader(auth: AuthMode): { name: string; value: string } | null {
    if (auth === "none") {
      return null;
    }
    if (auth === "apiKey") {
      if (!this.apiKey) {
        throw new Error("This HiltClient instance does not have an API key configured.");
      }
      return { name: "X-Hilt-Key", value: this.apiKey };
    }
    if (auth === "bearer") {
      if (!this.bearerToken) {
        throw new Error("This HiltClient instance does not have a bearer token configured.");
      }
      return { name: "Authorization", value: `Bearer ${this.bearerToken}` };
    }
    if (this.apiKey) {
      return { name: "X-Hilt-Key", value: this.apiKey };
    }
    if (this.bearerToken) {
      return { name: "Authorization", value: `Bearer ${this.bearerToken}` };
    }
    throw new Error("This HiltClient instance needs either an API key or a bearer token for merchant routes.");
  }

  private async buildError(response: Response): Promise<HiltApiError> {
    const contentType = response.headers.get("content-type") || "";
    let payload: unknown = undefined;
    let message = `HTTP ${response.status}`;
    let code: string | undefined;
    let docsUrl: string | undefined;

    try {
      if (contentType.includes("application/json")) {
        payload = await response.json();
      } else {
        payload = await response.text();
      }
    } catch {
      payload = undefined;
    }

    if (typeof payload === "string" && payload.trim()) {
      message = payload;
    } else if (payload && typeof payload === "object") {
      const data = payload as Record<string, unknown>;
      const detail = valueAsRecord(data.detail);
      message =
        stringField(detail, "message", "detail") ??
        (typeof data.detail === "string" && data.detail.trim() ? data.detail : undefined) ??
        stringField(data, "message", "error_description") ??
        message;
      code = stringField(detail, "code", "error") ?? stringField(data, "code", "error");
      docsUrl = stringField(detail, "docs_url", "docsUrl") ?? stringField(data, "docs_url", "docsUrl");
    }

    return new HiltApiError(response.status, message, code, payload, {
      requestId: requestIdFromHeaders(response.headers),
      retryable: retryableFrom(response.status, code, payload),
      docsUrl: docsUrl ?? docsUrlForCode(code),
      rawResponse: {
        statusCode: response.status,
        headers: safeResponseHeaders(response.headers),
        body: payload,
      },
    });
  }
}
