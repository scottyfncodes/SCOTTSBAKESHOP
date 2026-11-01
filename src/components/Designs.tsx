import Link from "next/link";
import { DESIGNS, merchFor } from "@/lib/merch";
import { fromPrice } from "@/lib/product-price";
import type { Product } from "@/lib/types";

/** The artwork behind the merch, each linking to the pieces that carry it. Only designs on sale are shown. */
export function Designs({ products }: { products: Product[] }) {
  const designs = DESIGNS.map((d) => ({
    design: d,
    items: products.filter((p) => merchFor(p.name).designs.some((x) => x.slug === d.slug)),
  })).filter((d) => d.items.length > 0);
  if (designs.length === 0) return null;

  return (
    <section className="designs" aria-labelledby="designs-heading">
      <div className="container">
        <div className="section-head">
          <h2 id="designs-heading">The artwork</h2>
          <p className="section-count">Original designs</p>
        </div>
        <div className="design-list">
          {designs.map(({ design, items }, i) => (
            <article key={design.slug} className="design">
              <div className="design-media">
                <img src={design.detail} alt={`${design.name} artwork, close up`} width={460} height={575} loading="lazy" />
              </div>
              <div className="design-body">
                <p className="design-no">No. {String(i + 1).padStart(2, "0")}</p>
                <h3>{design.name}</h3>
                <p className="design-note">{design.note}</p>
                <ul className="design-items">
                  {items.map((p) => (
                    <li key={p.id}>
                      <Link href={`/products/${p.id}`}>
                        <span>{merchFor(p.name).kind ?? p.name}</span>
                        <span className="price">{fromPrice(p)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
