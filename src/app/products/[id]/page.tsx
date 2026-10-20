import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@/components/Icons";
import { ProductBuy } from "@/components/ProductBuy";
import { ShopNotice } from "@/components/ShopNotice";
import { getCatalog } from "@/lib/catalog";

export const revalidate = 300;

type Params = { params: Promise<{ id: string }> };

async function load(id: string) {
  const catalog = await getCatalog();
  if (catalog.status !== "ok") return { catalog, product: null };
  return { catalog, product: catalog.products.find((p) => String(p.id) === id) ?? null };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { product } = await load((await params).id);
  return product
    ? { title: product.name, openGraph: { images: product.image ? [product.image] : [] } }
    : { title: "Merch" };
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

  return (
    <div className="container">
      <Link href="/#shop" className="back-link" style={{ marginTop: 8 }}>
        <ArrowLeft /> All merch
      </Link>
      <ProductBuy product={product} />
    </div>
  );
}
