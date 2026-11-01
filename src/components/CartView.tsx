"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { lineImage, merchFor } from "@/lib/merch";
import type { Product, Variant } from "@/lib/types";
import { MAX_QTY, useCart } from "./CartProvider";

export function findLine(products: Product[], variantId: number): { product: Product; variant: Variant } | null {
  for (const product of products) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}

export const optionText = (v: Variant) => [v.color, v.size].filter(Boolean).join(" / ");

export function CartView({ products }: { products: Product[] }) {
  const { lines, ready, setQuantity, remove } = useCart();

  if (!ready)
    return (
      <div className="loading-block" role="status">
        <span className="spinner" aria-hidden="true" /> Loading your cart…
      </div>
    );

  if (lines.length === 0)
    return (
      <div className="notice">
        <h2>Your cart is empty</h2>
        <p style={{ marginBottom: 18 }}>Nothing in the oven yet.</p>
        <Link href="/#shop" className="btn btn-primary">Shop the merch</Link>
      </div>
    );

  const resolved = lines.map((l) => ({ line: l, match: findLine(products, l.variantId) }));
  const sellable = resolved.filter((r) => r.match?.variant.available);
  const blocked = resolved.length !== sellable.length;
  const currency = sellable[0]?.match?.variant.currency ?? "USD";
  const subtotal = sellable.reduce((s, r) => s + r.match!.variant.price * r.line.quantity, 0);

  return (
    <div className="cart-layout">
      <ul className="cart-lines" aria-label="Cart items">
        {resolved.map(({ line, match }) => (
          <li key={line.variantId} className="cart-line">
            {match && lineImage(match.product, match.variant) ? (
              <img src={lineImage(match.product, match.variant)!} alt="" width={88} height={88} />
            ) : (
              <div className="thumb-placeholder" aria-hidden="true" />
            )}
            <div>
              <h3>
                {match ? <Link href={`/products/${match.product.id}`}>{merchFor(match.product.name).title}</Link> : "Item no longer available"}
              </h3>
              <p className="opts">
                {match ? optionText(match.variant) || " " : "Please remove this item."}
                {match && !match.variant.available && <strong style={{ color: "var(--danger)" }}> · Sold out</strong>}
              </p>
              <div className="cart-line-controls">
                {match?.variant.available ? (
                  <div className="stepper" aria-label={`Quantity for ${merchFor(match.product.name).title}`}>
                    <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity(line.variantId, line.quantity - 1)}>−</button>
                    <output aria-live="polite">{line.quantity}</output>
                    <button type="button" aria-label="Increase quantity" disabled={line.quantity >= MAX_QTY} onClick={() => setQuantity(line.variantId, line.quantity + 1)}>+</button>
                  </div>
                ) : <span />}
                <span className="price">{match ? formatMoney(match.variant.price * line.quantity, match.variant.currency) : ""}</span>
              </div>
              <button type="button" className="link-btn" onClick={() => remove(line.variantId)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <aside className="summary" aria-label="Order summary">
        <h2>Summary</h2>
        <div className="summary-row"><span>Subtotal</span><span>{formatMoney(subtotal, currency)}</span></div>
        <div className="summary-row"><span>Shipping</span><span className="muted">At checkout</span></div>
        {blocked && <p className="alert" style={{ marginTop: 12 }}>Remove unavailable items to continue.</p>}
        {blocked ? (
          <span className="btn btn-dark btn-block" aria-disabled="true">Checkout</span>
        ) : (
          <Link href="/checkout" className="btn btn-dark btn-block">Checkout</Link>
        )}
        <p className="fine">Each item is printed to order. Shipping is calculated from your address.</p>
      </aside>
    </div>
  );
}
