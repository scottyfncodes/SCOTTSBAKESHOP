import type { Metadata } from "next";
import { CartView } from "@/components/CartView";
import { ShopNotice } from "@/components/ShopNotice";
import { getCatalog } from "@/lib/catalog";

export const metadata: Metadata = { title: "Cart" };
export const revalidate = 300;

export default async function CartPage() {
  const catalog = await getCatalog();
  return (
    <div className="container page">
      <h1>Your cart</h1>
      {catalog.status === "ok" ? <CartView products={catalog.products} /> : <ShopNotice status={catalog.status} />}
    </div>
  );
}
