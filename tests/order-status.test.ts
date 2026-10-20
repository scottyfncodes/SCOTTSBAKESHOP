import { describe, expect, it } from "vitest";
import { maskEmail, orderView } from "@/lib/order-status";

describe("orderView", () => {
  it("only reports confirmation when payment and fulfillment are both recorded", () => {
    expect(orderView({ status: "complete", payment_status: "paid" }, "submitted")).toBe("confirmed");
    expect(orderView({ status: "complete", payment_status: "paid" }, "draft")).toBe("confirmed");
    expect(orderView({ status: "complete", payment_status: "paid" })).toBe("pending_fulfillment");
    expect(orderView({ status: "complete", payment_status: "paid" }, "failed")).toBe("fulfillment_problem");
    expect(orderView({ status: "complete", payment_status: "unpaid" })).toBe("payment_processing");
    expect(orderView({ status: "open", payment_status: "unpaid" })).toBe("payment_incomplete");
    expect(orderView({ status: "expired", payment_status: "unpaid" })).toBe("expired");
  });

  it("masks emails", () => {
    expect(maskEmail("patbaker@example.com")).toBe("pa••••••@example.com");
    expect(maskEmail(null)).toBeNull();
  });
});
