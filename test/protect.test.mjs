import assert from "node:assert/strict";
import test from "node:test";

import { HiltClient, protectEndpoint } from "../dist/index.js";
import { encodeX402Header, PAYMENT_REQUIRED_HEADER, PAYMENT_RESPONSE_HEADER } from "../dist/x402.js";

const customerHeaders = {
  "X-Agent-Id": "agent-42",
  "X-Request-Id": "request-0001",
};

function response(body, status = 200) {
  return Response.json(body, { status });
}

function clientFor(fetch) {
  return new HiltClient({ apiKey: "test-key", baseUrl: "https://api.hilt.test", fetch });
}

test("serves only after atomic usage consumption", async () => {
  const calls = [];
  const client = clientFor(async (url) => {
    calls.push(new URL(url).pathname);
    return response({
      consumed: true,
      units: 1,
      usage: { unit: "request", granted: 10, consumed: 1, remaining: 9 },
      entitlement: { id: "ent-1" },
    });
  });
  const endpoint = protectEndpoint({
    client,
    externalProductId: "research-calls",
    handler: async (_request, context) => response({ ok: true, requestId: context.requestId }),
  });

  const result = await endpoint(new Request("https://merchant.test/research", { headers: customerHeaders }));

  assert.equal(result.status, 200);
  assert.deepEqual(calls, ["/v1/access/entitlements/consume"]);
  assert.deepEqual(await result.json(), { ok: true, requestId: "request-0001" });
});

test("returns Hilt's payment requirement without running billable work", async () => {
  let handlerCalls = 0;
  const client = clientFor(async (url) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/entitlements/consume")) {
      return response({ code: "usage_balance_insufficient", message: "Payment required" }, 409);
    }
    assert.equal(path, "/v1/access/payment-sessions");
    return response({
      payment_session: {
        payment_requirement: { headers: { [PAYMENT_REQUIRED_HEADER]: "encoded-requirement" } },
      },
    });
  });
  const endpoint = protectEndpoint({
    client,
    externalProductId: "research-calls",
    handler: async () => {
      handlerCalls += 1;
      return response({ ok: true });
    },
  });

  const result = await endpoint(new Request("https://merchant.test/research", { headers: customerHeaders }));

  assert.equal(result.status, 402);
  assert.equal(result.headers.get(PAYMENT_REQUIRED_HEADER), "encoded-requirement");
  assert.equal(result.headers.get("X-Hilt-Request-Id"), "request-0001");
  assert.equal(handlerCalls, 0);
});

test("settles a retry, consumes once, then relays PAYMENT-RESPONSE", async () => {
  const paths = [];
  const client = clientFor(async (url) => {
    const path = new URL(url).pathname;
    paths.push(path);
    if (path.endsWith("/x402/settle")) {
      return response({
        x402Version: 2,
        payment_session_id: "session-1",
        payment_proof: {},
        settlement_evidence: {},
        receipt: {},
        entitlement: {},
        payment_response: { success: true, transaction: "tx-1", network: "solana" },
        headers: { [PAYMENT_RESPONSE_HEADER]: "encoded-payment-response" },
      });
    }
    return response({
      consumed: true,
      units: 1,
      usage: { unit: "request", granted: 10, consumed: 1, remaining: 9 },
      entitlement: { id: "ent-1" },
    });
  });
  const paymentSignature = encodeX402Header({
    x402Version: 2,
    resource: { url: "https://merchant.test/research" },
    accepted: {
      scheme: "hilt-exact",
      network: "solana:mainnet",
      asset: "usdc",
      amount: "1000",
      payTo: "merchant",
      maxTimeoutSeconds: 60,
      extra: { hilt: { paymentSessionId: "session-1" } },
    },
    payload: { transaction: "signed" },
  });
  const endpoint = protectEndpoint({
    client,
    externalProductId: "research-calls",
    handler: async () => response({ paid: true }),
  });

  const result = await endpoint(new Request("https://merchant.test/research", {
    headers: { ...customerHeaders, "PAYMENT-SIGNATURE": paymentSignature },
  }));

  assert.equal(result.status, 200);
  assert.deepEqual(paths, ["/v1/access/x402/settle", "/v1/access/entitlements/consume"]);
  assert.equal(result.headers.get(PAYMENT_RESPONSE_HEADER), "encoded-payment-response");
});

test("rejects requests without stable identities before calling Hilt", async () => {
  let apiCalls = 0;
  const endpoint = protectEndpoint({
    client: clientFor(async () => {
      apiCalls += 1;
      return response({});
    }),
    externalProductId: "research-calls",
    handler: async () => response({ ok: true }),
  });

  const result = await endpoint(new Request("https://merchant.test/research"));

  assert.equal(result.status, 400);
  assert.equal(apiCalls, 0);
});

test("never creates a second payment when settled usage is not ready", async () => {
  const paths = [];
  const client = clientFor(async (url) => {
    const path = new URL(url).pathname;
    paths.push(path);
    if (path.endsWith("/x402/settle")) {
      return response({
        x402Version: 2,
        payment_session_id: "session-1",
        payment_proof: {},
        settlement_evidence: {},
        receipt: {},
        entitlement: {},
        payment_response: { success: true, transaction: "tx-1", network: "solana" },
        headers: { [PAYMENT_RESPONSE_HEADER]: "settled" },
      });
    }
    return response({ code: "entitlement_not_active", message: "Retry" }, 409);
  });
  const paymentSignature = encodeX402Header({
    x402Version: 2,
    resource: { url: "https://merchant.test/research" },
    accepted: { extra: { hilt: { paymentSessionId: "session-1" } } },
    payload: { transaction: "signed" },
  });
  const endpoint = protectEndpoint({
    client,
    externalProductId: "research-calls",
    handler: async () => response({ should_not_run: true }),
  });

  const result = await endpoint(new Request("https://merchant.test/research", {
    headers: { ...customerHeaders, "PAYMENT-SIGNATURE": paymentSignature },
  }));

  assert.equal(result.status, 409);
  assert.deepEqual(paths, ["/v1/access/x402/settle", "/v1/access/entitlements/consume"]);
  assert.equal(result.headers.get(PAYMENT_RESPONSE_HEADER), "settled");
});
