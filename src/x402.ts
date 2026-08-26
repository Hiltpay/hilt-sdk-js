import type {
  HiltX402Acceptance,
  HiltX402AtomicTransfer,
  HiltX402PaymentPayload,
  HiltX402PaymentRequired,
} from "./types.js";

export const HILT_X402_VERSION = 2 as const;
export const HILT_EXACT_SCHEME = "hilt-exact" as const;
export const SOLANA_MAINNET_CAIP2 = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
export const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const PAYMENT_REQUIRED_HEADER = "PAYMENT-REQUIRED";
export const PAYMENT_SIGNATURE_HEADER = "PAYMENT-SIGNATURE";
export const PAYMENT_RESPONSE_HEADER = "PAYMENT-RESPONSE";

export interface PreparedHiltExactPayment {
  accepted: HiltX402Acceptance;
  paymentPayload: HiltX402PaymentPayload;
  paymentSignature: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value.trim());
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function encodeX402Header(value: unknown): string {
  return bytesToBase64(new TextEncoder().encode(JSON.stringify(value)));
}

export function decodeX402Header<T = unknown>(value: string): T {
  const text = new TextDecoder().decode(base64ToBytes(value));
  return JSON.parse(text) as T;
}

function parsePositiveAmount(value: string, field: string): bigint {
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Error(field + " must be a positive integer string.");
  }
  return BigInt(value);
}

export function getHiltExactTransfers(
  acceptance: HiltX402Acceptance,
): HiltX402AtomicTransfer[] {
  if (acceptance.scheme !== HILT_EXACT_SCHEME) {
    throw new Error("The selected x402 acceptance does not use hilt-exact.");
  }
  if (acceptance.network !== SOLANA_MAINNET_CAIP2 || acceptance.asset !== SOLANA_USDC_MINT) {
    throw new Error("hilt-exact currently supports Solana USDC on mainnet.");
  }
  const transfers = acceptance.extra?.hilt?.atomicTransfers;
  if (!Array.isArray(transfers) || transfers.length !== 2) {
    throw new Error("hilt-exact requires one merchant transfer and one Hilt fee transfer.");
  }
  const roles = new Set(transfers.map((transfer) => transfer.role));
  if (roles.size !== 2 || !roles.has("merchant") || !roles.has("hilt_fee")) {
    throw new Error("hilt-exact transfer roles are invalid.");
  }
  const total = transfers.reduce(
    (sum, transfer) => sum + parsePositiveAmount(transfer.amount, transfer.role + " amount"),
    0n,
  );
  if (total !== parsePositiveAmount(acceptance.amount, "acceptance amount")) {
    throw new Error("hilt-exact transfer amounts do not equal the advertised amount.");
  }
  const merchant = transfers.find((transfer) => transfer.role === "merchant");
  if (!merchant || merchant.payTo !== acceptance.payTo) {
    throw new Error("The merchant transfer does not match acceptance.payTo.");
  }
  if (transfers.some((transfer) => transfer.asset !== SOLANA_USDC_MINT)) {
    throw new Error("Every hilt-exact transfer must use Solana USDC.");
  }
  return transfers;
}

export function decodePaymentRequiredHeader(value: string): HiltX402PaymentRequired {
  const parsed = decodeX402Header<HiltX402PaymentRequired>(value);
  if (parsed.x402Version !== HILT_X402_VERSION || !Array.isArray(parsed.accepts)) {
    throw new Error("PAYMENT-REQUIRED must contain an x402 V2 payment requirement.");
  }
  return parsed;
}

export function getHiltPaymentSessionId(paymentSignature: string): string {
  const payload = decodeX402Header<HiltX402PaymentPayload>(paymentSignature);
  const paymentSessionId = payload.accepted?.extra?.hilt?.paymentSessionId;
  if (!paymentSessionId) {
    throw new Error("PAYMENT-SIGNATURE is not bound to a Hilt payment session.");
  }
  return paymentSessionId;
}

export function createHiltExactPaymentSignature(
  paymentRequired: HiltX402PaymentRequired,
  signedTransactionBase64: string,
): PreparedHiltExactPayment {
  if (paymentRequired.accepts[0]?.scheme !== HILT_EXACT_SCHEME) {
    throw new Error("The selected x402 acceptance does not use hilt-exact.");
  }
  return createPaymentSignature(paymentRequired, signedTransactionBase64);
}

export function createPaymentSignature(
  paymentRequired: HiltX402PaymentRequired,
  signedTransactionBase64: string,
): PreparedHiltExactPayment {
  if (paymentRequired.x402Version !== HILT_X402_VERSION || paymentRequired.accepts.length !== 1) {
    throw new Error("Hilt requires one x402 V2 payment acceptance.");
  }
  const accepted = paymentRequired.accepts[0];
  if (accepted.scheme === HILT_EXACT_SCHEME) {
    getHiltExactTransfers(accepted);
  } else if (accepted.scheme !== "exact") {
    throw new Error("The selected x402 payment scheme is not supported.");
  }
  if (!signedTransactionBase64.trim()) {
    throw new Error("A signed Solana transaction is required.");
  }
  try {
    if (base64ToBytes(signedTransactionBase64).length === 0) {
      throw new Error("empty");
    }
  } catch {
    throw new Error("The signed Solana transaction must be base64 encoded.");
  }
  const paymentPayload: HiltX402PaymentPayload = {
    x402Version: HILT_X402_VERSION,
    resource: paymentRequired.resource,
    accepted,
    payload: { transaction: signedTransactionBase64.trim() },
  };
  return {
    accepted,
    paymentPayload,
    paymentSignature: encodeX402Header(paymentPayload),
  };
}
