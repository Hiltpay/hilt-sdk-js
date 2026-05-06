# `@hiltpay/sdk`

Official TypeScript SDK for Hilt's supported merchant contract.

Source: `https://github.com/Hiltpay/hilt-sdk-js`

This SDK wraps the same public merchant routes documented on `docs.hilt.so`:

- products
- hosted checkout
- payments
- memberships
- receipts
- support
- webhooks

It is designed for Node 18+ and modern runtimes with `fetch`.

## Install

```bash
npm install @hiltpay/sdk
```

If you want a direct bundle instead of npm:

```bash
npm install https://www.hilt.so/downloads/hilt-sdk-latest.tgz
```

If you want a pinned direct bundle:

```bash
npm install https://www.hilt.so/downloads/hilt-sdk-1.0.0.tgz
```

### Verify a direct-bundle checksum

```bash
curl -O https://www.hilt.so/downloads/hilt-sdk-1.0.0.tgz
curl -O https://www.hilt.so/downloads/hilt-sdk-1.0.0.tgz.sha256
sha256sum -c hilt-sdk-1.0.0.tgz.sha256
```

## Example

```ts
import { HiltClient } from "@hiltpay/sdk";

const client = new HiltClient({
  apiKey: process.env.HILT_API_KEY!,
});

const product = await client.products.create({
  product_type: "PAYMENT_LINK",
  title: "Members lounge",
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
    renewal_mode: "MANUAL",
    billing_interval_days: 30,
    grace_period_days: 3
  }
});

console.log(product.id, product.slug);
```

## Quick start

1. Launch one real product in the Hilt app first.
2. Create an API key for backend automation.
3. Use the SDK to read or create the same product from your own system.
4. Switch longer-running automation to Hilt webhooks.
5. Use one tiny live payment before real traffic.

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
