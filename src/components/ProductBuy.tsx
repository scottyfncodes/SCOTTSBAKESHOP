"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";
import { MAX_QTY, useCart } from "./CartProvider";

export function ProductBuy({ product }: { product: Product }) {
  const { add } = useCart();
  const firstAvailable = product.variants.find((v) => v.available) ?? product.variants[0];
  const [color, setColor] = useState<string | null>(firstAvailable.color);
  const [size, setSize] = useState<string | null>(product.sizes.length > 1 ? null : firstAvailable.size);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const hasColors = product.colors.length > 1;
  const hasSizes = product.sizes.length > 1;

  const variant = useMemo(
    () =>
      product.variants.find(
        (v) => (!hasColors || v.color === color) && (!hasSizes || v.size === size),
      ) ?? null,
    [product.variants, hasColors, hasSizes, color, size],
  );

  const forColor = (c: string | null) => product.variants.filter((v) => !hasColors || v.color === c);
  const sizeAvailable = (s: string) => forColor(color).some((v) => v.size === s && v.available);
  const colorAvailable = (c: string) => product.variants.some((v) => v.color === c && v.available);

  const image = variant?.image ?? forColor(color)[0]?.image ?? product.image;
  const price = variant?.price ?? Math.min(...forColor(color).map((v) => v.price));

  function onAdd() {
    if (hasSizes && !size) return setMessage({ kind: "err", text: "Pick a size first." });
    if (!variant || !variant.available) return setMessage({ kind: "err", text: "That option is sold out." });
    add(variant.id, qty);
    setMessage({ kind: "ok", text: `Added ${qty} to your cart.` });
  }

  return (
    <div className="product">
      <div className="product-media">
        {image && <img src={image} alt={[product.name, color].filter(Boolean).join(", ")} width={900} height={900} />}
      </div>

      <div>
        <h1>{product.name}</h1>
        <p className="price">{Number.isFinite(price) ? formatMoney(price, product.currency) : ""}</p>

        {hasColors && (
          <fieldset className="option-group">
            <legend>Color: <span>{color}</span></legend>
            <div className="chips" role="radiogroup" aria-label="Color">
              {product.colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  role="radio"
                  aria-checked={color === c.name}
                  data-unavailable={!colorAvailable(c.name)}
                  className="chip"
                  onClick={() => {
                    setColor(c.name);
                    setMessage(null);
                  }}
                >
                  <span className="swatch-dot" style={{ background: c.code ?? "#ccc" }} aria-hidden="true" />
                  {c.name}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {hasSizes && (
          <fieldset className="option-group">
            <legend>Size{size ? <>: <span>{size}</span></> : null}</legend>
            <div className="chips" role="radiogroup" aria-label="Size">
              {product.sizes.map((s) => {
                const ok = sizeAvailable(s);
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={size === s}
                    aria-label={ok ? s : `${s} (sold out)`}
                    data-unavailable={!ok}
                    className="chip"
                    onClick={() => {
                      setSize(s);
                      setMessage(null);
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="sticky-buy">
          <div className="buy-row">
            <div className="stepper" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)}>−</button>
              <output aria-live="polite">{qty}</output>
              <button type="button" aria-label="Increase quantity" disabled={qty >= MAX_QTY} onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onAdd}
              aria-disabled={!!variant && !variant.available}
            >
              {variant && !variant.available ? "Sold out" : "Add to cart"}
            </button>
          </div>
          <p className={`inline-msg ${message?.kind ?? ""}`} role="status" aria-live="polite">
            {message?.text}
            {message?.kind === "ok" && (
              <> <Link href="/cart">View cart →</Link></>
            )}
          </p>
        </div>

        {product.description && <div className="description">{product.description}</div>}
      </div>
    </div>
  );
}
