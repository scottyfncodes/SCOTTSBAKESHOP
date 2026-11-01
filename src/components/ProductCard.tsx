import Link from "next/link";
import { merchFor } from "@/lib/merch";
import { fromPrice } from "@/lib/product-price";
import type { Product } from "@/lib/types";

export function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  const merch = merchFor(product.name);
  // A second real photo, revealed on hover where hover exists (print close-up, other side, etc.).
  const alt = [...product.photos, ...product.images].find((u) => u !== product.image) ?? null;
  const soldOut = product.variants.every((v) => !v.available);

  return (
    <Link href={`/products/${product.id}`} className="card">
      <div className="card-media">
        {product.image ? (
          <img src={product.image} alt={merch.title} loading={eager ? "eager" : "lazy"} width={600} height={600} />
        ) : null}
        {alt && product.image ? <img className="card-alt" src={alt} alt="" loading="lazy" width={600} height={600} /> : null}
      </div>
      <div className="card-body">
        {merch.kind && <p className="card-kicker">{merch.kind}</p>}
        <h3 className="card-title">{merch.title}</h3>
        <p className={`card-price${soldOut ? " muted" : ""}`}>{fromPrice(product)}</p>
        {product.colors.length > 1 && (
          <span className="swatches" aria-label={`${product.colors.length} colors`}>
            {product.colors.slice(0, 6).map((c) => (
              <span key={c.name} className="swatch-dot" style={{ background: c.code ?? "#ccc" }} title={c.name} />
            ))}
          </span>
        )}
      </div>
    </Link>
  );
}
