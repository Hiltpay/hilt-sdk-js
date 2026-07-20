# `@hiltpay/sdk`

Official TypeScript SDK for Hilt Pay Workspace and Hilt Pay API.

Source: `https://github.com/Hiltpay/hilt-sdk-js`

Agent discovery contract:

- Agent manifest: `https://www.hilt.so/.well-known/hilt-agent.json`
- Agent Discovery Standard: `https://www.hilt.so/agent-discovery-standard`
- OpenAPI: `https://api.hilt.so/v1/openapi.json`
- Grok Build guide: `https://docs.hilt.so/developers/grok-build`
- Runnable Next.js example: `https://github.com/Hiltpay/hilt-developer-assets/tree/main/examples/grok-build-nextjs`

This SDK wraps the same public merchant routes documented on `docs.hilt.so`:

- products
- hosted checkout
- payments
- memberships
- receipts
- support
- webhooks
- Hilt Pay API apps, products, entitlements, setup manifests, and agent bootstrap
- native subscription state and cancellation helpers
- x402 V2 settlement and atomic metered-entitlement consumption

It is designed for Node 18+ and modern runtimes with `fetch`.

## Install

```bash
npm install @hiltpay/sdk
```

For source review and approved public snapshots, use the GitHub repository and
`hilt-developer-assets` repository.

## Example

### Metered agent requests

Create products with `usage_unit` and `usage_units_per_payment`, then consume a unit before serving each billable request:

```ts
const usage = await client.payApi.consumeEntitlement(
  {
    external_product_id: "research-calls",
    external_customer_id: "agent_42",
    units: 1,
    metadata: { request_id: "req_01J..." },
  },
  { idempotencyKey: "req_01J..." },
);

if (!usage.consumed) {
  throw new Error("Usage was not consumed");
}
```

Use `@hiltpay/sdk/x402` to decode Hilt's x402 V2 requirement, validate `hilt-exact` terms, and encode the signed Solana transaction as `PAYMENT-SIGNATURE`. Keep the Hilt API key on the protected-resource server; the buyer or agent wallet constructs and signs the payment transaction.

Guide: `https://docs.hilt.so/developers/agent-micropayments`
Complete example: `https://github.com/Hiltpay/hilt-developer-assets/tree/main/examples/agent-micropayments`

### Agent-first Hilt Pay API bootstrap

Current public live settlement is Solana USDC. The `payment_protocol: "x402"` field describes the protected-resource HTTP 402 flow.

```ts
import { HiltClient } from "@hiltpay/sdk";

const publicClient = new HiltClient();

const setup = await publicClient.payApi.agentBootstrap({
  agent_name: "Acme API Builder",
  agent_platform: "cursor",
  requested_use_case: "Protect /ai/pro with Hilt Pay API",
  contact_email: "founder@acme.test",
  requested_permissions: ["access:read", "access:write", "access:webhooks"]
});

const manifest = await publicClient.payApi.submitAgentSetupManifest(setup.setup_intent_id, {
  setup_token: setup.setup_token,
  manifest: {
    app: { name: "Acme AI" },
    product: {
      external_product_id: "pro-api",
      title: "Pro API access",
      amount_minor_units: 79000000,
      default_rail: "solana_usdc",
      billing_model: "recurring",
      renewal_mode: "solana_native_subscription",
      billing_interval_days: 30,
      cancel_at_period_end: true,
      expected_monthly_payments: 120,
      expected_monthly_volume_usd: 9480
    },
    payment_protocol: "x402",
    settlement_rail: "solana_usdc",
    protected_resource: {
      url: "https://api.acme.test/ai/pro",
      method: "POST",
      customer_identity: "external_customer_id"
    },
    webhook: {
      url: "https://api.acme.test/webhooks/hilt",
      subscribed_events: ["access.entitlement.activated", "payment.confirmed"]
    }
  }
});

console.log(manifest.pricing_recommendation?.recommended_plan); // starter, growth, or scale
console.log(setup.owner_approval_url); // send the owner here for the one-minute approval step
```

### Check access before serving a resource

Use this in every API route, middleware, worker, or tool call that needs to know whether a customer has access right now.

```ts
import { HiltClient } from "@hiltpay/sdk";

const client = new HiltClient({
  apiKey: process.env.HILT_API_KEY!,
});

export async function POST(request: Request) {
  const externalCustomerId = request.headers.get("X-Customer-Id");

  if (!externalCustomerId) {
    return Response.json({ error: "missing_customer" }, { status: 400 });
  }

  const access = await client.payApi.checkEntitlement({
    external_product_id: "pro-api",
    external_customer_id: externalCustomerId,
  });

  if (!access.has_access) {
    return Response.json(
      {
        error: "payment_required",
        status: access.status,
        reason: access.reason,
        external_product_id: access.external_product_id,
      },
      { status: 402 }
    );
  }

  return Response.json({ ok: true });
}
```

### Merchant workspace product

```ts
import { HiltClient } from "@hiltpay/sdk";

const client = new HiltClient({
  apiKey: process.env.HILT_API_KEY!,
});

const product = await client.products.create({
  product_type: "PAYMENT_LINK",
  title: "30-day members lounge",
  amount_minor_units: 200000,
  token_mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  merchant_wallet: "So1anaMerchantWallet1111111111111111111111111",
  delivery_type: "REDIRECT",
  delivery_value: "https://example.com/welcome",
  membership_config: {
    enabled: true,
    platform: "CUSTOM",
    identity_type: "WALLET",
    identity_required: false,
    renewal_mode: "ONE_OFF",
    billing_interval_days: 30,
    grace_period_days: 3
  }
});

console.log(product.id, product.slug);
```

### Native subscription state and cancellation

```ts
const subscription = await client.payApi.getNativeSubscription("AUTHORIZATION_ID");

const cancelIntent = await client.payApi.createNativeSubscriptionCancelIntent("AUTHORIZATION_ID", {
  reason: "buyer_requested",
  cancel_at_period_end: true
});

const cancelled = await client.payApi.confirmNativeSubscriptionCancel(
  "AUTHORIZATION_ID",
  {
    cancel_tx_signature: "SOLANA_CANCEL_TRANSACTION_SIGNATURE",
    reason: "buyer_requested",
    immediate_revoke: false
  },
  "native-cancel-AUTHORIZATION_ID-001"
);

console.log(subscription.status, cancelIntent.status, cancelled.status);
```

### Sandbox session helpers

```ts
const sandbox = await client.payApi.createSandboxPaymentSession(
  {
    external_product_id: "pro-api",
    external_customer_id: "cust_123",
    rail: "solana_usdc",
    confirm_sandbox_mode: true
  },
  { idempotencyKey: "sandbox-session-cust-123-pro-api-001" }
);

if (!sandbox.payment_session?.id) {
  throw new Error("Sandbox session id missing from Hilt response");
}

const confirmed = await client.payApi.confirmSandboxPaymentSession(
  sandbox.payment_session.id,
  { proof: "sandbox-confirmed-access" },
  { idempotencyKey: "sandbox-confirm-cust-123-pro-api-001" }
);

console.log(confirmed.entitlement);
```

### Webhook verification and routing

```ts
import { constructWebhookEvent, createWebhookRouter } from "@hiltpay/sdk";

const router = createWebhookRouter()
  .on("payment.confirmed", async (event) => {
    await grantAccess(event.data);
  })
  .on("membership.expired", async (event) => {
    await removeAccess(event.data);
  });

export async function POST(request: Request) {
  const rawBody = await request.text();
  const event = await constructWebhookEvent(
    rawBody,
    request.headers.get("X-Hilt-Signature"),
    process.env.HILT_WEBHOOK_SECRET!
  );

  await router.dispatch(event);
  return Response.json({ ok: true });
}
```

Hilt signs `<timestamp>.<raw_json_body>` and sends the signature as `X-Hilt-Signature: t=<unix_timestamp>,v1=<hex_hmac_sha256>`.

### Error handling

```ts
import { HiltApiError } from "@hiltpay/sdk";

try {
  await client.payApi.createPaymentSession(body, { idempotencyKey: "session-001" });
} catch (error) {
  if (error instanceof HiltApiError) {
    console.error(error.code, error.statusCode, error.requestId, error.retryable, error.docsUrl);
  }
}
```

`HiltApiError` includes the public error code, HTTP status, Hilt request id when available, retryability, docs URL, and safe response details.

The error catalog lives at `https://docs.hilt.so/developers/errors`. SDK `docsUrl` values point to anchors such as `#payment-failed`, `#idempotency-in-progress`, and `#request-timeout`.

### Subscription helper boundary

The SDK exposes the current public native subscription routes: read an authorization, create a cancellation intent, and confirm the signed cancellation. Public endpoints for list, pause, resume, or browser-safe customer management sessions are not exposed yet, so the SDK does not fake those methods. Build recurring access today with a recurring product, a payment session, signed webhooks, and entitlement checks.

Proposed backend contract for future high-level subscription helpers:

```text
POST /v1/access/subscriptions
GET  /v1/access/subscriptions/{subscription_id}
GET  /v1/access/subscriptions
POST /v1/access/subscriptions/{subscription_id}/pause
POST /v1/access/subscriptions/{subscription_id}/resume
POST /v1/access/subscriptions/{subscription_id}/cancel
POST /v1/access/customer-sessions
POST /v1/access/sandbox/subscriptions/{subscription_id}/advance-period
```

The browser-facing contract should return only a short-lived customer token or hosted management URL. It must never expose a Hilt API key in browser code.

## Quick start

1. Create or approve a Hilt Pay API setup intent.
2. Use the SDK to create an app, product, payment session, and webhook.
3. Use sandbox sessions to validate object handling without live money.
4. Use entitlement checks before serving paid work.
5. For recurring access, create products with `billing_model: "recurring"` and `renewal_mode: "solana_native_subscription"`.

## Auth surfaces

For most merchant routes, configure either:

- `apiKey` for server-to-server merchant automation
- `bearerToken` for dashboard-session tooling

Webhook endpoint management currently requires a dashboard session token, so the webhook methods use the configured `bearerToken`.

## What the SDK is best at

- products and hosted checkout
- payment confirmation and reads
- membership lookup, renewal intelligence, and recovery
- receipt proof, PDF access, and proof sending
- support tickets and webhook endpoint operations

## Build from source

```bash
npm install
npm run build
npm pack
```
