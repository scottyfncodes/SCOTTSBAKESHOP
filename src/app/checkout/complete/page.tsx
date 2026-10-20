import type { Metadata } from "next";
import Link from "next/link";
import type Stripe from "stripe";
import { ClearCart } from "@/components/ClearCart";
import { formatMoney } from "@/lib/format";
import { maskEmail, orderView, type OrderView } from "@/lib/order-status";
import { site } from "@/lib/site";
import { getStripe } from "@/lib/stripe";

export const metadata: Metadata = { title: "Order status", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ session_id?: string }> };

const COPY: Record<OrderView, { badge: string; tone: "ok" | "warn"; title: string; body: string }> = {
  confirmed: { badge: "✓", tone: "ok", title: "Order confirmed. Thank you!", body: "Your order has been sent to our print partner and is being made just for you." },
  pending_fulfillment: { badge: "✓", tone: "ok", title: "Payment received. Thank you!", body: "We're sending your order to production now. This page updates if you refresh it." },
  fulfillment_problem: { badge: "!", tone: "warn", title: "Payment received, but we hit a snag", body: "Your payment went through, but we couldn't start production automatically. We'll review it and email you; you won't be charged twice." },
  payment_processing: { badge: "…", tone: "warn", title: "Your payment is processing", body: "Your bank is still confirming the payment. We'll start your order as soon as it clears and email you either way." },
  payment_incomplete: { badge: "!", tone: "warn", title: "Payment wasn't completed", body: "You haven't been charged. Your cart is still saved." },
  expired: { badge: "!", tone: "warn", title: "This checkout expired", body: "You haven't been charged. Your cart is still saved." },
};

async function loadSession(id: string | undefined) {
  const stripe = getStripe();
  if (!stripe || !id || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return null;
  try {
    return await stripe.checkout.sessions.retrieve(id, { expand: ["line_items", "payment_intent"] });
  } catch {
    return null;
  }
}

export default async function CompletePage({ searchParams }: Props) {
  const session = await loadSession((await searchParams).session_id);

  if (!session)
    return (
      <div className="container page confirm">
        <h1>We couldn&rsquo;t find that order</h1>
        <p className="muted">If you completed a payment, check your email for a receipt.</p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: 12 }}>Back to the shop</Link>
      </div>
    );

  const pi = typeof session.payment_intent === "object" ? (session.payment_intent as Stripe.PaymentIntent | null) : null;
  const view = orderView(session, pi?.metadata.fulfillment_status);
  const copy = COPY[view];
  const paid = view !== "payment_incomplete" && view !== "expired";
  const currency = (session.currency ?? "usd").toUpperCase();
  const email = maskEmail(session.customer_details?.email);

  return (
    <div className="container page confirm">
      {paid && <ClearCart />}
      <div className={`confirm-badge ${copy.tone}`} aria-hidden="true">{copy.badge}</div>
      <h1>{copy.title}</h1>
      <p className="muted">{copy.body}</p>

      {paid && (
        <>
          <div className="summary">
            {pi && <p className="fine" style={{ marginTop: 0 }}>Order reference <strong>{pi.id.slice(-10).toUpperCase()}</strong></p>}
            <ul className="summary-items" style={{ marginTop: 12 }}>
              {session.line_items?.data.map((li) => (
                <li key={li.id} style={{ gridTemplateColumns: "1fr auto" }}>
                  <span>{li.description} × {li.quantity}</span>
                  <span className="price">{formatMoney(li.amount_total, currency)}</span>
                </li>
              ))}
            </ul>
            <div className="summary-row"><span>Subtotal</span><span>{formatMoney(session.amount_subtotal ?? 0, currency)}</span></div>
            <div className="summary-row"><span>Shipping</span><span>{formatMoney(session.total_details?.amount_shipping ?? 0, currency)}</span></div>
            <div className="summary-row"><span>Tax</span><span>{formatMoney(session.total_details?.amount_tax ?? 0, currency)}</span></div>
            <div className="summary-row total"><span>Total paid</span><span>{formatMoney(session.amount_total ?? 0, currency)}</span></div>
          </div>
          <ol className="next-steps">
            {email && <li>A receipt is on its way to {email}.</li>}
            <li>Each item is printed to order, then shipped. See <Link href="/shipping">shipping info</Link>.</li>
            {pi?.metadata.tracking_url ? (
              <li>Shipped! <a href={pi.metadata.tracking_url} target="_blank" rel="noopener noreferrer">Track your package</a>.</li>
            ) : (
              <li>Bookmark this page. Tracking appears here once your order ships.</li>
            )}
            {site.contactEmail && <li>Questions? Email <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.</li>}
          </ol>
        </>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
        {!paid && <Link href="/checkout" className="btn btn-primary">Return to checkout</Link>}
        <Link href="/" className={`btn ${paid ? "btn-primary" : "btn-ghost"}`}>Back to the shop</Link>
      </div>
    </div>
  );
}
