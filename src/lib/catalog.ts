import "server-only";
import { env } from "./env";
import {
  printful,
  PrintfulNotConfigured,
  type PfCatalogProduct,
  type PrintfulClient,
  type PfSyncProduct,
  type PfSyncVariant,
} from "./printful";
import type { Catalog, Product, Variant } from "./types";

const REVALIDATE_SECONDS = 300;

export function toCents(price: string | null | undefined): number {
  const n = Number.parseFloat(price ?? "");
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

/** Printful variant names look like "Hoodie / Black / M" or "Hat - Khaki". */
function parseVariantName(name: string): { color: string | null; size: string | null } {
  const tail = name.includes(" - ") ? name.slice(name.lastIndexOf(" - ") + 3) : name;
  const parts = tail.split(" / ").map((s) => s.trim());
  if (parts.length >= 2) return { color: parts[parts.length - 2], size: parts[parts.length - 1] };
  return { color: null, size: null };
}

function previewImage(v: PfSyncVariant): string | null {
  const preview = v.files.find((f) => f.type === "preview" && f.preview_url);
  return preview?.preview_url ?? v.product?.image ?? null;
}

/** Mockups ("preview" files) first, then print-file previews (front, back, sleeve…). */
export function variantImages(v: PfSyncVariant): string[] {
  const mockups = v.files.filter((f) => f.type === "preview").map((f) => f.preview_url);
  const prints = v.files.filter((f) => f.type !== "preview").map((f) => f.preview_url);
  return unique([...mockups, ...prints]);
}

function unique(urls: (string | null | undefined)[]): string[] {
  return [...new Set(urls.filter((u): u is string => !!u))];
}

const APPAREL_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"];

const UNAVAILABLE = new Set(["discontinued", "out_of_stock", "temporary_out_of_stock", "stocked_out"]);

export function normalizeProduct(sync: PfSyncProduct, catalog: PfCatalogProduct | null): Product | null {
  const catalogVariants = new Map(catalog?.variants.map((cv) => [cv.id, cv]) ?? []);

  const variants: Variant[] = sync.sync_variants
    .filter((v) => !v.is_ignored)
    .map((v) => {
      const cv = catalogVariants.get(v.variant_id);
      const parsed = parseVariantName(v.name);
      const price = toCents(v.retail_price);
      return {
        id: v.id,
        catalogVariantId: v.variant_id,
        color: v.color ?? cv?.color ?? parsed.color,
        colorCode: cv?.color_code ?? null,
        size: v.size ?? cv?.size ?? parsed.size,
        price,
        currency: (v.currency || "USD").toUpperCase(),
        image: previewImage(v),
        images: variantImages(v),
        available:
          v.synced &&
          price > 0 &&
          cv?.in_stock !== false &&
          !UNAVAILABLE.has(v.availability_status ?? ""),
      };
    });

  if (variants.length === 0) return null;

  // Apparel sizes in wearing order; anything else keeps Printful's catalog order.
  // (Printful's catalog lists some products' sizes alphabetically.)
  const catalogOrder = catalog?.variants.map((cv) => cv.size) ?? [];
  const rank = (size: string) => {
    const i = APPAREL_SIZES.indexOf(size.toUpperCase());
    if (i !== -1) return i;
    const c = catalogOrder.indexOf(size);
    return APPAREL_SIZES.length + (c === -1 ? 999 : c);
  };
  const sizes = [...new Set(variants.map((v) => v.size).filter((s): s is string => !!s))].sort(
    (a, b) => rank(a) - rank(b),
  );

  const colors: Product["colors"] = [];
  for (const v of variants) {
    if (v.color && !colors.some((c) => c.name === v.color)) colors.push({ name: v.color, code: v.colorCode });
  }

  return {
    id: sync.sync_product.id,
    name: sync.sync_product.name,
    description: catalog?.product.description?.trim() || null,
    image: sync.sync_product.thumbnail_url ?? variants[0].image,
    images: unique([sync.sync_product.thumbnail_url, ...variants.flatMap((v) => [v.image, ...v.images])]),
    currency: variants[0].currency,
    colors,
    sizes,
    variants,
  };
}

async function loadProduct(id: string, revalidate: number | false): Promise<Product | null> {
  const sync = await printful.getStoreProduct(id, revalidate);
  if (sync.sync_product.is_ignored) return null;
  const catalogId = sync.sync_variants[0]?.product?.product_id;
  const catalog = catalogId
    ? await printful.getCatalogProduct(catalogId, revalidate).catch(() => null)
    : null;
  return normalizeProduct(sync, catalog);
}

/**
 * The products to sell: PRINTFUL_PRODUCT_IDS when set (in that order),
 * otherwise every synced, non-ignored product in the Printful store.
 */
export async function resolveProductIds(
  client: Pick<PrintfulClient, "listStoreProducts">,
  configured: string[],
  revalidate: number | false,
): Promise<string[]> {
  if (configured.length > 0) return configured;
  const all = await client.listStoreProducts(revalidate);
  const sellable = all.filter((p) => !p.is_ignored && p.synced > 0);
  if (sellable.length === 0) {
    // Names and counts only, so an empty shelf can be explained from the logs.
    console.warn(
      `[catalog] no sellable Printful store products (${all.length} listed):`,
      all.map((p) => `${p.id} "${p.name}" synced=${p.synced}/${p.variants}${p.is_ignored ? " ignored" : ""}`).join("; ") || "none",
    );
  }
  return sellable.map((p) => String(p.id));
}

/**
 * Loads the Printful products for sale. `fresh` bypasses the cache — used
 * when pricing a checkout so a stale page can never set the charge amount.
 */
export async function getCatalog({ fresh = false } = {}): Promise<Catalog> {
  if (!env.printfulToken()) return { status: "unconfigured" };
  const revalidate = fresh ? false : REVALIDATE_SECONDS;
  try {
    const ids = await resolveProductIds(printful, env.printfulProductIds(), revalidate);
    const products = await Promise.all(ids.map((id) => loadProduct(id, revalidate)));
    return { status: "ok", products: products.filter((p): p is Product => p !== null) };
  } catch (err) {
    if (err instanceof PrintfulNotConfigured) return { status: "unconfigured" };
    console.error("[catalog] failed to load Printful products:", (err as Error).message);
    return { status: "error" };
  }
}

export function findVariant(products: Product[], variantId: number) {
  for (const product of products) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}
