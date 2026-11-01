import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@/components/Icons";
import { ProductBuy } from "@/components/ProductBuy";
import { ProductCard } from "@/components/ProductCard";
import { ShopNotice } from "@/components/ShopNotice";
import { getCatalog } from "@/lib/catalog";
import { env } from "@/lib/env";
import { merchFor } from "@/lib/merch";

export const revalidate = 300;

type Params = { params: Promise<{ id: string }> };

async function load(id: string) {
  const catalog = await getCatalog();
  if (catalog.status !== "ok") return { catalog, product: null };
  return { catalog, product: catalog.products.find((p) => String(p.id) === id) ?? null };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { product } = await load((await params).id);
  if (!product) return { title: "Merch" };
  const merch = merchFor(product.name);
  const description = merch.note
    ? `${merch.title} from Scott's Bake Shop. ${merch.note}`
    : `${merch.title} from Scott's Bake Shop, printed to order.`;
  return {
    title: merch.title,
    description,
    openGraph: { title: merch.title, description, images: product.image ? [product.image] : [] },
  };
}

export default async function ProductPage({ params }: Params) {
  const { catalog, product } = await load((await params).id);
  if (catalog.status !== "ok")
    return (
      <div className="container page">
        <ShopNotice status={catalog.status} />
      </div>
    );
  if (!product) notFound();

  const names = new Intl.DisplayNames(["en"], { type: "region" });
  const shipTo = env.shipCountries().map((c) => names.of(c) ?? c).join(", ");
  const designs = new Set(merchFor(product.name).designs.map((d) => d.slug));
  const shares = (p: (typeof catalog.products)[number]) => merchFor(p.name).designs.some((d) => designs.has(d.slug));
  // Pieces with the same artwork first, then everything else.
  const others = catalog.products.filter((p) => p.id !== product.id);
  const related = [...others.filter(shares), ...others.filter((p) => !shares(p))].slice(0, 4);

  return (
    <div className="container">
      <Link href="/#shop" className="back-link">
        <ArrowLeft /> All merch
      </Link>
      <ProductBuy product={product} shipTo={shipTo} />
      {related.length > 0 && (
        <section className="related" aria-labelledby="related-heading">
          <div className="section-head">
            <h2 id="related-heading">More from the shop</h2>
          </div>
          <div className="shelf">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
