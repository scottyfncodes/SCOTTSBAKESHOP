import { ProductCard } from "@/components/ProductCard";
import { ShopNotice } from "@/components/ShopNotice";
import { getCatalog } from "@/lib/catalog";

export const revalidate = 300;

export default async function Home() {
  const catalog = await getCatalog();

  return (
    <>
      <section className="hero">
        <div className="container">
          <img className="hero-logo" src="/logo.png" alt="Scott's Bake Shop, hand made" width={132} height={132} />
          <h1>Let&rsquo;s get this bread</h1>
          <p>Scott&rsquo;s Bake Shop merch, printed to order and shipped to your door.</p>
          <a href="#shop" className="btn btn-primary">Shop the merch</a>
        </div>
      </section>

      <section id="shop" className="container" aria-labelledby="shop-heading" style={{ scrollMarginTop: 84 }}>
        <div className="section-head">
          <h2 id="shop-heading">The goods</h2>
        </div>
        {catalog.status !== "ok" ? (
          <ShopNotice status={catalog.status} />
        ) : catalog.products.length === 0 ? (
          <ShopNotice status="empty" />
        ) : (
          <div className="shelf">
            {catalog.products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
