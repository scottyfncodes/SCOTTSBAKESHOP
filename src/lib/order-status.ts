import type Stripe from "stripe";

export type OrderView =
  | "confirmed"
  | "pending_fulfillment"
  | "fulfillment_problem"
  | "payment_processing"
  | "payment_incomplete"
  | "expired";

/** What the customer should be told, derived only from verified Stripe state. */
export function orderView(session: Pick<Stripe.Checkout.Session, "status" | "payment_status">, fulfillment?: string): OrderView {
  if (session.status === "expired") return "expired";
  if (session.status !== "complete") return "payment_incomplete";
  if (session.payment_status !== "paid") return "payment_processing";
  if (fulfillment === "failed" || fulfillment === "canceled") return "fulfillment_problem";
  if (fulfillment) return "confirmed";
  return "pending_fulfillment";
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [user, domain] = email.split("@");
  if (!domain) return null;
  return `${user.slice(0, 2)}${"•".repeat(Math.max(1, Math.min(user.length - 2, 6)))}@${domain}`;
}
