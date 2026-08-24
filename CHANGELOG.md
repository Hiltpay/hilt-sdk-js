# Changelog

## Unreleased

## 1.3.0 - 2026-08-24

- Add native SOL as a typed Hilt Pay API settlement rail
- Add typed hosted-session amount, asset, payout, expiry, and settlement fields
- Align agent setup pricing types and examples with Live pay-as-you-go pricing
- Remove the retired Hilt Pay API subscription-checkout helper

## 1.2.0

- Add x402 V2 settlement and atomic metered-entitlement methods
- Add typed Hilt x402 payment requirements and settlement responses
- Add the dependency-free `@hiltpay/sdk/x402` header and payment-term validation helpers
- Add product usage grants and entitlement usage response types

## 1.1.0

- Add structured `HiltError` and `HiltApiError` models with request ids, retryability, docs URLs, and safe response details
- Add typed webhook signature verification and router helpers
- Add request-level idempotency-key support and SDK sandbox payment-session helpers
- Add recurring-access and framework examples for Hilt Pay API integrations
- Document current native subscription helper boundaries and future backend contracts without faking unavailable routes

## 1.0.3

- Add typed Hilt Pay API agent setup responses, manifest evaluations, and pricing recommendations
- Update agent bootstrap examples with owner approval and plan recommendation fields
- Add native subscription read and cancellation helpers for Hilt Pay API
- Update recurring examples for Solana USDC native automatic renewals

## 1.0.2

- Align agent bootstrap examples with the flat `setup_intent_id` response field
- Keep nested `setup_intent.id` compatibility for existing integrations

## 1.0.1

- Add Hilt Pay API agent bootstrap, setup manifest, billing checkout, and entitlement helpers
- Add Hilt Pay API payment proof and payment session helper types
- Refresh public README language for Workspace and API usage

## 1.0.0

- Initial public TypeScript SDK for the supported Hilt merchant contract
- Products, checkout, payments, memberships, receipts, support, and webhooks
- Merchant API-key and dashboard bearer-token auth support
