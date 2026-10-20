import "server-only";
import { env } from "./env";
import {
  printful,
  PrintfulNotConfigured,
  type PfCatalogProduct,
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
        available:
          v.synced &&
          price > 0 &&
          cv?.in_stock !== false &&
          !UNAVAILABLE.has(v.availability_status ?? ""),
      };
    });

  if (variants.length === 0) return null;

  // Keep Printful's catalog ordering for sizes (S, M, L… rather than alphabetical).
  const sizeOrder = catalog?.variants.map((cv) => cv.size) ?? [];
  const sizes = [...new Set(variants.map((v) => v.size).filter((s): s is string => !!s))].sort(
    (a, b) => {
      const ia = sizeOrder.indexOf(a);
      const ib = sizeOrder.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    },
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
 * Loads the configured Printful products. `fresh` bypasses the cache — used
 * when pricing a checkout so a stale page can never set the charge amount.
 */
export async function getCatalog({ fresh = false } = {}): Promise<Catalog> {
  const ids = env.printfulProductIds();
  if (!env.printfulToken() || ids.length === 0) return { status: "unconfigured" };
  try {
    const products = await Promise.all(ids.map((id) => loadProduct(id, fresh ? false : REVALIDATE_SECONDS)));
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
