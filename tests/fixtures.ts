import type { PfCatalogProduct, PfSyncProduct, PfSyncVariant } from "@/lib/printful";

export function syncVariant(over: Partial<PfSyncVariant> & { id: number; variant_id: number; name: string }): PfSyncVariant {
  return {
    synced: true,
    retail_price: "35.00",
    currency: "USD",
    is_ignored: false,
    product: { variant_id: over.variant_id, product_id: 71, image: "https://files.cdn.printful.com/blank.png", name: "Blank" },
    files: [{ type: "preview", preview_url: `https://files.cdn.printful.com/preview-${over.id}.png`, thumbnail_url: null }],
    ...over,
  };
}

export const teeSync: PfSyncProduct = {
  sync_product: { id: 1001, name: "T-Shirt - Black", thumbnail_url: "https://files.cdn.printful.com/tee.png" },
  sync_variants: [
    syncVariant({ id: 5003, variant_id: 4018, name: "T-Shirt - Black / L" }),
    syncVariant({ id: 5001, variant_id: 4016, name: "T-Shirt - Black / S" }),
    syncVariant({ id: 5002, variant_id: 4017, name: "T-Shirt - Black / M" }),
    syncVariant({ id: 5004, variant_id: 4019, name: "T-Shirt - Black / XL", is_ignored: true }),
    syncVariant({ id: 5005, variant_id: 4020, name: "T-Shirt - Black / 2XL", retail_price: "37.00" }),
  ],
};

export const teeCatalog: PfCatalogProduct = {
  product: { id: 71, description: "Soft tee.\n• 100% cotton" },
  variants: [
    { id: 4016, size: "S", color: "Black", color_code: "#0c0c0c", in_stock: true },
    { id: 4017, size: "M", color: "Black", color_code: "#0c0c0c", in_stock: true },
    { id: 4018, size: "L", color: "Black", color_code: "#0c0c0c", in_stock: true },
    { id: 4019, size: "XL", color: "Black", color_code: "#0c0c0c", in_stock: true },
    { id: 4020, size: "2XL", color: "Black", color_code: "#0c0c0c", in_stock: false },
  ],
};

export const hatSync: PfSyncProduct = {
  sync_product: { id: 1002, name: "Hat", thumbnail_url: "https://files.cdn.printful.com/hat.png" },
  sync_variants: [
    syncVariant({ id: 6001, variant_id: 7854, name: "Hat - Khaki", retail_price: "20.00", product: { variant_id: 7854, product_id: 206, image: "x", name: "Dad hat" } }),
    syncVariant({ id: 6002, variant_id: 7855, name: "Hat - Stone", retail_price: "20.00", product: { variant_id: 7855, product_id: 206, image: "x", name: "Dad hat" } }),
  ],
};

export const hatCatalog: PfCatalogProduct = {
  product: { id: 206, description: "Dad hats aren't just for dads." },
  variants: [
    { id: 7854, size: "One size", color: "Khaki", color_code: "#b9a787", in_stock: true },
    { id: 7855, size: "One size", color: "Stone", color_code: "#d6c6b0", in_stock: true },
  ],
};
