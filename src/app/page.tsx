import Link from "next/link";
import { Designs } from "@/components/Designs";
import { Shelf } from "@/components/Shelf";
import { ShopNotice } from "@/components/ShopNotice";
import { Story } from "@/components/Story";
import { getCatalog } from "@/lib/catalog";
import { merchFor } from "@/lib/merch";
import { fromPrice } from "@/lib/product-price";

export const revalidate = 300;

export default async function Home() {
  const catalog = await getCatalog();
  const products = catalog.status === "ok" ? catalog.products : [];
  // The hero shows one real product photo on wide screens: the first piece we have our own photo for.
  const featured = products.find((p) => p.photosLead && p.image) ?? null;

  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="container hero-grid">
          <div className="hero-copy">
            <img className="hero-logo" src="/logo.png" alt="Scott's Bake Shop, hand made" width={132} height={132} />
            <p className="eyebrow">Apparel &amp; goods &middot; Printed to order</p>
            <h1 id="hero-heading">Let&rsquo;s get this bread</h1>
            <p className="hero-sub">Shirts, hats and mugs from Scott&rsquo;s Bake Shop, printed to order and shipped to your door.</p>
            <a href="#shop" className="btn btn-primary">Shop the merch</a>
          </div>
          {featured && (
            <Link href={`/products/${featured.id}`} className="hero-feature">
              <span className="hero-feature-media">
                <img src={featured.image!} alt={merchFor(featured.name).title} width={900} height={900} fetchPriority="high" />
              </span>
              <span className="hero-feature-caption">
                <span>{merchFor(featured.name).title}</span>
                <span className="price">{fromPrice(featured)}</span>
              </span>
            </Link>
          )}
        </div>
      </section>

      <section id="shop" className="container shop" aria-labelledby="shop-heading">
        <div className="section-head">
          <h2 id="shop-heading">The goods</h2>
          {products.length > 0 && <p className="section-count">{products.length} {products.length === 1 ? "piece" : "pieces"}</p>}
        </div>
        {catalog.status !== "ok" ? (
          <ShopNotice status={catalog.status} />
        ) : products.length === 0 ? (
          <ShopNotice status="empty" />
        ) : (
          <Shelf products={products} />
        )}
      </section>

      {products.length > 0 && <Designs products={products} />}
      <Story />
    </>
  );
}
