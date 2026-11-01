"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { merchFor } from "@/lib/merch";
import type { Product } from "@/lib/types";
import { MAX_QTY, useCart } from "./CartProvider";
import { ArtistCredit } from "./ArtistCredit";
import { BundleNote } from "./BundleNote";
import { Lightbox } from "./Lightbox";

export function ProductBuy({ product, shipTo }: { product: Product; shipTo: string }) {
  const { add } = useCart();
  const merch = merchFor(product.name);
  const firstAvailable = product.variants.find((v) => v.available) ?? product.variants[0];
  const [color, setColor] = useState<string | null>(firstAvailable.color);
  const [size, setSize] = useState<string | null>(product.sizes.length > 1 ? null : firstAvailable.size);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const sizeGroup = useRef<HTMLFieldSetElement>(null);

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

  // Main picture first (our lead photo, or the chosen color's mockup), then the rest.
  const lead = variant ?? forColor(color)[0];
  const ordered = product.photosOnly
    ? product.photos
    : product.photosLead
    ? [...product.photos, lead?.image, ...(lead?.images ?? []), ...product.images]
    : [lead?.image, ...product.photos, ...(lead?.images ?? []), product.image, ...product.images];
  const gallery = [...new Set(ordered)].filter((u): u is string => !!u);
  const [shown, setShown] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const current = Math.min(shown, Math.max(gallery.length - 1, 0));
  const track = useRef<HTMLDivElement>(null);
  const price = variant?.price ?? Math.min(...forColor(color).map((v) => v.price));
  const soldOut = !!variant && !variant.available;

  function goTo(i: number, smooth = true) {
    setShown(i);
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }

  function onAdd() {
    if (hasSizes && !size) {
      setMessage({ kind: "err", text: "Pick a size first." });
      sizeGroup.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!variant || !variant.available) return setMessage({ kind: "err", text: "That option is sold out." });
    add(variant.id, qty);
    setMessage({ kind: "ok", text: `Added ${qty} to your cart.` });
  }

  return (
    <div className="product">
      <div className="product-gallery">
        <div className="pdp-frame">
          <div
            className="pdp-track"
            ref={track}
            onScroll={(e) => {
              const el = e.currentTarget;
              const i = Math.round(el.scrollLeft / el.clientWidth);
              if (i !== current && i >= 0 && i < gallery.length) setShown(i);
            }}
          >
            {gallery.map((src, i) => (
              <button
                key={src}
                type="button"
                className="pdp-slide"
                aria-label={`View photo ${i + 1} of ${gallery.length} larger`}
                onClick={() => {
                  setShown(i);
                  setZoomed(true);
                }}
              >
                <img
                  src={src}
                  alt={i === 0 ? [merch.title, color].filter(Boolean).join(", ") : ""}
                  width={900}
                  height={900}
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </button>
            ))}
          </div>
          {gallery.length > 1 && (
            <p className="pdp-count" aria-hidden="true">
              {current + 1} / {gallery.length}
            </p>
          )}
        </div>
        {zoomed && gallery.length > 0 && (
          <Lightbox
            images={gallery}
            index={current}
            alt={merch.title}
            onIndex={(i) => goTo(i, false)}
            onClose={() => setZoomed(false)}
          />
        )}
        {gallery.length > 1 && (
          <div className="thumbs" role="group" aria-label="Product photos">
            {gallery.map((src, i) => (
              <button
                key={src}
                type="button"
                className="thumb"
                aria-label={`Photo ${i + 1} of ${gallery.length}`}
                aria-pressed={i === current}
                onClick={() => goTo(i)}
              >
                <img src={src} alt="" width={120} height={120} loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pdp-info">
        {(merch.category || merch.designs.length > 0) && (
          <p className="pdp-kicker">
            {[merch.category, merch.designs.length === 1 ? merch.designs[0].name : null].filter(Boolean).join(" · ")}
          </p>
        )}
        <h1>{merch.title}</h1>
        <p className="pdp-price">{Number.isFinite(price) ? formatMoney(price, product.currency) : ""}</p>
        {merch.note && <p className="pdp-note">{merch.note}</p>}
        {merch.designs.map((d) => (
          <ArtistCredit key={d.slug} design={d} named={merch.designs.length > 1} />
        ))}

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
                    goTo(0, false);
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
        {!hasColors && product.colors.length === 1 && (
          <p className="pdp-solo">Color: <span>{product.colors[0].name}</span></p>
        )}
        {!hasSizes && product.sizes.length === 1 && (
          // One size only (sticker, mug, hat): nothing to pick, but buyers still need to know it.
          <p className="pdp-solo">Size: <span>{product.sizes[0].replace(/\s*[×x]\s*/, " × ")}</span></p>
        )}

        {hasSizes && (
          <fieldset
            className="option-group"
            ref={sizeGroup}
            data-attention={message?.kind === "err" && !size ? "true" : undefined}
          >
            <legend>Size{size ? <>: <span>{size}</span></> : <> <span>(choose one)</span></>}</legend>
            <div className="chips chips-size" role="radiogroup" aria-label="Size">
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
            <button type="button" className="btn btn-primary" onClick={onAdd} aria-disabled={soldOut}>
              {soldOut ? (
                "Sold out"
              ) : (
                <>
                  Add to cart
                  {Number.isFinite(price) && <span className="btn-price">{formatMoney(price * qty, product.currency)}</span>}
                </>
              )}
            </button>
          </div>
          <p className={`inline-msg ${message?.kind ?? ""}`} role="status" aria-live="polite">
            {message?.text}
            {message?.kind === "ok" && (
              <>
                {" "}
                <Link href="/cart">View cart</Link> or <Link href="/checkout">check out</Link>
              </>
            )}
          </p>
        </div>

        <p className="pdp-assure">Printed to order for you, then shipped. Shipping is calculated at checkout.</p>
        <BundleNote className="on-pdp" />

        <div className="pdp-details">
          {merch.details ? (
            <details open>
              <summary>Product details</summary>
              <div className="description">
                <p>{merch.details.intro}</p>
                <ul className="spec-list">
                  {merch.details.specs.map((spec) => (
                    <li key={spec}>{spec}</li>
                  ))}
                </ul>
                {merch.details.note && <p className="spec-note">{merch.details.note}</p>}
              </div>
            </details>
          ) : (
            product.description && (
              <details open>
                <summary>Product details</summary>
                <div className="description">{product.description}</div>
              </details>
            )
          )}
          <details>
            <summary>Shipping &amp; fulfillment</summary>
            <div className="description">
              <p>
                Every piece is printed after you order by our print partner, Printful, so allow time for production
                before it ships. You&rsquo;ll see live carrier rates and delivery estimates for your address
                before you pay.
              </p>
              <p>We ship to: {shipTo}.</p>
              <p><Link href="/shipping">Shipping details</Link></p>
            </div>
          </details>
          <details>
            <summary>Returns</summary>
            <div className="description">
              <p>
                Because each item is made to order, please check your size before buying. If something arrives damaged,
                misprinted or wrong, we&rsquo;ll make it right.
              </p>
              <p><Link href="/returns">Returns &amp; exchanges</Link></p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
