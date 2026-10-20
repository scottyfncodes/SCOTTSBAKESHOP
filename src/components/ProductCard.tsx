import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const available = product.variants.filter((v) => v.available);
  const prices = (available.length ? available : product.variants).map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return (
    <Link href={`/products/${product.id}`} className="card">
      <div className="card-media">
        {product.image ? <img src={product.image} alt={product.name} loading="lazy" width={600} height={600} /> : null}
      </div>
      <div className="card-body">
        <h3 className="card-title">{product.name}</h3>
        <div className="card-meta">
          <span className="price">
            {available.length === 0 ? "Sold out" : `${min !== max ? "From " : ""}${formatMoney(min, product.currency)}`}
          </span>
          {product.colors.length > 1 && (
            <span className="swatches" aria-label={`${product.colors.length} colors`}>
              {product.colors.slice(0, 6).map((c) => (
                <span key={c.name} className="swatch-dot" style={{ background: c.code ?? "#ccc" }} title={c.name} />
              ))}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
