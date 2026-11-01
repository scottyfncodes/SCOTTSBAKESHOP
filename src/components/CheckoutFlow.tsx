"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { formatMoney } from "@/lib/format";
import { lineImage, merchFor } from "@/lib/merch";
import { US_STATES } from "@/lib/regions";
import type { Product, ShippingAddress, ShippingOption } from "@/lib/types";
import { useCart } from "./CartProvider";
import { findLine, optionText } from "./CartView";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

const EMPTY: ShippingAddress = { name: "", email: "", address1: "", address2: "", city: "", state: "", zip: "", country: "", phone: "" };

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data as T;
}

export function CheckoutFlow({ products, countries, checkoutOpen }: { products: Product[]; countries: { code: string; name: string }[]; checkoutOpen: boolean }) {
  const { lines, ready } = useCart();
  const [address, setAddress] = useState<ShippingAddress>({ ...EMPTY, country: countries[0]?.code ?? "US" });
  const [step, setStep] = useState<"address" | "shipping" | "pay">("address");
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [method, setMethod] = useState<string>("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolved = useMemo(
    () => lines.map((l) => ({ line: l, match: findLine(products, l.variantId) })).filter((r) => r.match?.variant.available),
    [lines, products],
  );
  const items = resolved.map((r) => ({ variantId: r.line.variantId, quantity: r.line.quantity }));
  const currency = resolved[0]?.match?.variant.currency ?? "USD";
  const subtotal = resolved.reduce((s, r) => s + r.match!.variant.price * r.line.quantity, 0);
  const shipping = options.find((o) => o.id === method);

  if (!ready)
    return <div className="loading-block" role="status"><span className="spinner" aria-hidden="true" /> Loading…</div>;

  if (items.length === 0 || items.length !== lines.length)
    return (
      <div className="notice">
        <h2>{lines.length === 0 ? "Your cart is empty" : "Your cart needs a look"}</h2>
        <p style={{ marginBottom: 18 }}>
          {lines.length === 0 ? "Add something tasty before checking out." : "Some items are unavailable. Update your cart to continue."}
        </p>
        <Link href={lines.length === 0 ? "/#shop" : "/cart"} className="btn btn-primary">
          {lines.length === 0 ? "Shop the merch" : "Back to cart"}
        </Link>
      </div>
    );

  const set = (k: keyof ShippingAddress) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setAddress((a) => ({ ...a, [k]: e.target.value, ...(k === "country" ? { state: "" } : {}) }));

  async function getRates(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await post<{ options: ShippingOption[] }>("/api/shipping-rates", { items, address });
      setOptions(data.options);
      setMethod(data.options[0]?.id ?? "");
      setClientSecret(null);
      setStep("shipping");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function startPayment() {
    setBusy(true);
    setError(null);
    try {
      const data = await post<{ clientSecret: string }>("/api/checkout", { items, address, shippingMethod: method });
      setClientSecret(data.clientSecret);
      setStep("pay");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const isUS = address.country === "US";
  const stateLabel = address.country === "CA" ? "Province" : "State";

  return (
    <div className="cart-layout">
      <div className="steps">
        {error && <p className="alert" role="alert">{error}</p>}

        <section className="step" aria-labelledby="step-address">
          <h2 id="step-address"><span className="step-num">1</span> Ship to</h2>
          {step === "address" ? (
            <form onSubmit={getRates} noValidate={false}>
              <div className="form-grid">
                <div className="field span-2">
                  <label htmlFor="name">Full name</label>
                  <input id="name" required autoComplete="name" value={address.name} onChange={set("name")} maxLength={100} />
                </div>
                <div className="field span-2">
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" required autoComplete="email" inputMode="email" value={address.email} onChange={set("email")} maxLength={200} />
                </div>
                <div className="field span-2">
                  <label htmlFor="address1">Street address</label>
                  <input id="address1" required autoComplete="address-line1" value={address.address1} onChange={set("address1")} maxLength={200} />
                </div>
                <div className="field span-2">
                  <label htmlFor="address2">Apt, suite, etc. <span className="muted">(optional)</span></label>
                  <input id="address2" autoComplete="address-line2" value={address.address2} onChange={set("address2")} maxLength={200} />
                </div>
                <div className="field">
                  <label htmlFor="city">City</label>
                  <input id="city" required autoComplete="address-level2" value={address.city} onChange={set("city")} maxLength={100} />
                </div>
                <div className="field">
                  <label htmlFor="state">{stateLabel}</label>
                  {isUS ? (
                    <select id="state" required autoComplete="address-level1" value={address.state} onChange={set("state")}>
                      <option value="" disabled>Select…</option>
                      {US_STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                    </select>
                  ) : (
                    <input id="state" required={["CA", "AU"].includes(address.country)} autoComplete="address-level1" value={address.state} onChange={set("state")} maxLength={50} />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="zip">{isUS ? "ZIP code" : "Postal code"}</label>
                  <input id="zip" required autoComplete="postal-code" inputMode={isUS ? "numeric" : "text"} value={address.zip} onChange={set("zip")} maxLength={20} />
                </div>
                <div className="field">
                  <label htmlFor="country">Country</label>
                  <select id="country" required autoComplete="country" value={address.country} onChange={set("country")} disabled={countries.length < 2}>
                    {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field span-2">
                  <label htmlFor="phone">Phone <span className="muted">(optional, for delivery issues)</span></label>
                  <input id="phone" type="tel" autoComplete="tel" value={address.phone} onChange={set("phone")} maxLength={30} />
                </div>
              </div>
              <button type="submit" className="btn btn-dark btn-block" style={{ marginTop: 18 }} disabled={busy}>
                {busy ? <><span className="spinner" aria-hidden="true" /> Getting shipping rates…</> : "Continue to shipping"}
              </button>
            </form>
          ) : (
            <>
              <p className="step-summary">
                {address.name}<br />
                {address.address1}{address.address2 ? `, ${address.address2}` : ""}<br />
                {address.city}, {address.state} {address.zip} · {address.country}<br />
                {address.email}
              </p>
              <button type="button" className="link-btn" onClick={() => { setStep("address"); setClientSecret(null); }}>Edit address</button>
            </>
          )}
        </section>

        <section className="step" aria-labelledby="step-shipping" data-state={step === "address" ? "locked" : "open"}>
          <h2 id="step-shipping"><span className="step-num">2</span> Shipping</h2>
          {step === "shipping" && (
            <>
              <div className="rates" role="radiogroup" aria-label="Shipping method">
                {options.map((o) => (
                  <label key={o.id} className="rate">
                    <input type="radio" name="rate" value={o.id} checked={method === o.id} onChange={() => setMethod(o.id)} />
                    <span className="rate-name">
                      {o.name}
                      {o.minDays && o.maxDays && !/deliver/i.test(o.name) ? <small>Estimated {o.minDays}–{o.maxDays} business days in transit</small> : null}
                    </span>
                    <span className="price">{formatMoney(o.amount, o.currency)}</span>
                  </label>
                ))}
              </div>
              {checkoutOpen ? (
                <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={busy || !method} onClick={startPayment}>
                  {busy ? <><span className="spinner" aria-hidden="true" /> Preparing secure payment…</> : "Continue to payment"}
                </button>
              ) : (
                <p className="alert" style={{ marginTop: 18 }}>Online payment isn&rsquo;t switched on yet. Please check back soon.</p>
              )}
            </>
          )}
          {step === "pay" && shipping && (
            <>
              <p className="step-summary">{shipping.name} · {formatMoney(shipping.amount, shipping.currency)}</p>
              <button type="button" className="link-btn" onClick={() => { setStep("shipping"); setClientSecret(null); }}>Change shipping</button>
            </>
          )}
        </section>

        <section className="step" aria-labelledby="step-pay" data-state={step === "pay" ? "open" : "locked"}>
          <h2 id="step-pay"><span className="step-num">3</span> Payment</h2>
          {step === "pay" && clientSecret && stripePromise ? (
            <div className="embedded-checkout">
              <EmbeddedCheckoutProvider key={clientSecret} stripe={stripePromise} options={{ clientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Secure card, Apple Pay and Google Pay payment by Stripe.</p>
          )}
        </section>
      </div>

      <aside className="summary" aria-label="Order summary">
        <h2>Order</h2>
        <ul className="summary-items">
          {resolved.map(({ line, match }) => (
            <li key={line.variantId}>
              {lineImage(match!.product, match!.variant) ? <img src={lineImage(match!.product, match!.variant)!} alt="" width={52} height={52} className="thumb-placeholder" /> : <span className="thumb-placeholder" />}
              <span>
                {merchFor(match!.product.name).title} × {line.quantity}
                <br /><span className="muted">{optionText(match!.variant)}</span>
              </span>
              <span className="price">{formatMoney(match!.variant.price * line.quantity, currency)}</span>
            </li>
          ))}
        </ul>
        <div className="summary-row"><span>Subtotal</span><span>{formatMoney(subtotal, currency)}</span></div>
        <div className="summary-row"><span>Shipping</span><span>{shipping ? formatMoney(shipping.amount, currency) : <span className="muted">Next step</span>}</span></div>
        <div className="summary-row"><span>Tax</span><span className="muted">Calculated at payment</span></div>
        <div className="summary-row total"><span>Total before tax</span><span>{formatMoney(subtotal + (shipping?.amount ?? 0), currency)}</span></div>
        <p className="fine">Your card is charged once you pay. Prices are confirmed against our print partner&rsquo;s catalog.</p>
      </aside>
    </div>
  );
}
