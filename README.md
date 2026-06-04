# `@hiltpay/sdk`

Official TypeScript SDK for Hilt Pay Workspace and Hilt Pay API.

Source: `https://github.com/Hiltpay/hilt-sdk-js`

Agent discovery contract:

- Agent manifest: `https://www.hilt.so/.well-known/hilt-agent.json`
- Agent Discovery Standard: `https://www.hilt.so/agent-discovery-standard`
- OpenAPI: `https://api.hilt.so/v1/openapi.json`

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

It is designed for Node 18+ and modern runtimes with `fetch`.

## Install

```bash
npm install @hiltpay/sdk
```

For source review and approved public snapshots, use the GitHub repository and
`hilt-developer-assets` repository.

## Example

### Agent-first Hilt Pay API bootstrap

Public launch settlement is Solana USDC. The `payment_protocol: "x402"` field describes the protected-resource HTTP 402 flow.

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
