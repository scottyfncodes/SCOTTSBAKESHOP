import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

vi.mock("@/lib/fulfillment", () => ({ fulfillCheckoutSession: vi.fn() }));
vi.mock("@/lib/printful-events", () => ({ handlePrintfulEvent: vi.fn().mockResolvedValue({ handled: true }) }));

const { fulfillCheckoutSession } = await import("@/lib/fulfillment");
const { handlePrintfulEvent } = await import("@/lib/printful-events");
const stripeRoute = await import("@/app/api/webhooks/stripe/route");
const printfulRoute = await import("@/app/api/webhooks/printful/route");

const WHSEC = "whsec_test_secret";
const signer = new Stripe("sk_test_dummy");

function stripeRequest(payload: object, secret = WHSEC, header?: string) {
  const body = JSON.stringify(payload);
  const signature = header ?? signer.webhooks.generateTestHeaderString({ payload: body, secret });
  return new Request("https://scottsbakeshop.com/api/webhooks/stripe", { method: "POST", body, headers: { "stripe-signature": signature } });
}

const completed = { id: "evt_1", object: "event", type: "checkout.session.completed", data: { object: { id: "cs_test_1", object: "checkout.session" } } };

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", WHSEC);
  vi.stubEnv("PRINTFUL_WEBHOOK_SECRET", "pf-secret-token");
  vi.stubEnv("PRINTFUL_AUTO_CONFIRM", "true");
  vi.mocked(fulfillCheckoutSession).mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("Stripe webhook", () => {
  it("rejects requests without a signature", async () => {
    const req = new Request("https://x/api/webhooks/stripe", { method: "POST", body: JSON.stringify(completed) });
    expect((await stripeRoute.POST(req)).status).toBe(400);
    expect(fulfillCheckoutSession).not.toHaveBeenCalled();
  });

  it("rejects forged signatures", async () => {
    expect((await stripeRoute.POST(stripeRequest(completed, "whsec_wrong"))).status).toBe(400);
    expect((await stripeRoute.POST(stripeRequest(completed, WHSEC, "t=1,v1=deadbeef"))).status).toBe(400);
    expect(fulfillCheckoutSession).not.toHaveBeenCalled();
  });

  it("fulfills verified checkout.session.completed events, never auto-confirming in test mode", async () => {
    vi.mocked(fulfillCheckoutSession).mockResolvedValue({ outcome: "created", printfulOrderId: "1", status: "draft" });
    const res = await stripeRoute.POST(stripeRequest(completed));
    expect(res.status).toBe(200);
    expect(fulfillCheckoutSession).toHaveBeenCalledWith("cs_test_1", expect.objectContaining({ autoConfirm: false }));
  });

  it("auto-confirms only with a live key and the flag on", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_dummy");
    vi.mocked(fulfillCheckoutSession).mockResolvedValue({ outcome: "created", printfulOrderId: "1", status: "submitted" });
    await stripeRoute.POST(stripeRequest(completed));
    expect(fulfillCheckoutSession).toHaveBeenCalledWith("cs_test_1", expect.objectContaining({ autoConfirm: true }));
  });

  it("ignores unrelated events", async () => {
    const res = await stripeRoute.POST(stripeRequest({ ...completed, type: "checkout.session.expired" }));
    expect(res.status).toBe(200);
    expect(fulfillCheckoutSession).not.toHaveBeenCalled();
  });

  it("returns 500 on transient fulfillment errors so Stripe retries", async () => {
    vi.mocked(fulfillCheckoutSession).mockRejectedValue(new Error("Printful 503"));
    expect((await stripeRoute.POST(stripeRequest(completed))).status).toBe(500);
  });

  it("returns 200 for a permanent rejection (no infinite retries)", async () => {
    vi.mocked(fulfillCheckoutSession).mockResolvedValue({ outcome: "rejected", error: "bad" });
    expect((await stripeRoute.POST(stripeRequest(completed))).status).toBe(200);
  });
});

describe("Printful webhook", () => {
  const body = JSON.stringify({ type: "package_shipped", data: { order: { id: 777 } } });

  it("requires the shared token", async () => {
    expect((await printfulRoute.POST(new Request("https://x/api/webhooks/printful", { method: "POST", body }))).status).toBe(403);
    expect((await printfulRoute.POST(new Request("https://x/api/webhooks/printful?token=wrong", { method: "POST", body }))).status).toBe(403);
    expect(handlePrintfulEvent).not.toHaveBeenCalled();
  });

  it("accepts a valid token", async () => {
    const res = await printfulRoute.POST(new Request("https://x/api/webhooks/printful?token=pf-secret-token", { method: "POST", body }));
    expect(res.status).toBe(200);
    expect(handlePrintfulEvent).toHaveBeenCalled();
  });
});
