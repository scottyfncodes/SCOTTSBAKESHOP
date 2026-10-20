import "server-only";
import { env } from "./env";

const BASE = "https://api.printful.com";

export class PrintfulError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PrintfulError";
  }
  /** Network problems, rate limits and Printful outages are worth retrying. */
  get transient(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

export class PrintfulNotConfigured extends Error {
  constructor() {
    super("PRINTFUL_API_TOKEN is not set");
  }
}

type FetchOpts = { method?: string; body?: unknown; revalidate?: number | false };

export async function printfulFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const token = env.printfulToken();
  if (!token) throw new PrintfulNotConfigured();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const storeId = env.printfulStoreId();
  if (storeId) headers["X-PF-Store-Id"] = storeId;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      ...(opts.revalidate === undefined || opts.revalidate === false
        ? { cache: "no-store" as const }
        : { next: { revalidate: opts.revalidate } }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new PrintfulError(`Printful request failed: ${(err as Error).message}`, 0);
  }

  const json = (await res.json().catch(() => null)) as
    | { result?: unknown; error?: { message?: string } }
    | null;
  if (!res.ok) {
    const msg =
      json?.error?.message ?? (typeof json?.result === "string" ? json.result : res.statusText);
    throw new PrintfulError(`Printful ${res.status}: ${msg}`, res.status);
  }
  return json?.result as T;
}

// ---- Response shapes (only the fields we use) ---------------------------

export interface PfSyncProductSummary {
  id: number;
  name: string;
  thumbnail_url: string | null;
  variants: number;
  synced: number;
  is_ignored?: boolean;
}

export interface PfFile {
  type: string;
  preview_url: string | null;
  thumbnail_url: string | null;
}

export interface PfSyncVariant {
  id: number;
  name: string;
  synced: boolean;
  variant_id: number;
  retail_price: string | null;
  currency: string;
  is_ignored?: boolean;
  size?: string | null;
  color?: string | null;
  availability_status?: string;
  product: { variant_id: number; product_id: number; image: string; name: string };
  files: PfFile[];
}

export interface PfSyncProduct {
  sync_product: { id: number; name: string; thumbnail_url: string | null; is_ignored?: boolean };
  sync_variants: PfSyncVariant[];
}

export interface PfCatalogVariant {
  id: number;
  size: string;
  color: string;
  color_code: string;
  in_stock?: boolean;
}

export interface PfCatalogProduct {
  product: { id: number; title?: string; type_name?: string; description?: string };
  variants: PfCatalogVariant[];
}

export interface PfShippingRate {
  id: string;
  name: string;
  rate: string;
  currency: string;
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
}

export interface PfRecipient {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
}

export interface PfOrder {
  id: number;
  external_id: string | null;
  status: string;
  shipments?: { carrier: string; service: string; tracking_number: string; tracking_url: string }[];
}

// ---- Calls ---------------------------------------------------------------

export const printful = {
  listStoreProducts: () =>
    printfulFetch<PfSyncProductSummary[]>("/store/products?limit=100", { revalidate: false }),
  getStoreProduct: (id: string | number, revalidate: number | false) =>
    printfulFetch<PfSyncProduct>(`/store/products/${id}`, { revalidate }),
  getCatalogProduct: (id: number, revalidate: number | false) =>
    printfulFetch<PfCatalogProduct>(`/products/${id}`, { revalidate }),
  shippingRates: (recipient: Omit<PfRecipient, "name">, items: { variant_id: number; quantity: number }[], currency: string) =>
    printfulFetch<PfShippingRate[]>("/shipping/rates", {
      method: "POST",
      body: { recipient, items, currency },
    }),
  getOrderByExternalId: async (externalId: string): Promise<PfOrder | null> => {
    try {
      return await printfulFetch<PfOrder>(`/orders/@${encodeURIComponent(externalId)}`);
    } catch (err) {
      if (err instanceof PrintfulError && err.status === 404) return null;
      throw err;
    }
  },
  getOrder: (id: number) => printfulFetch<PfOrder>(`/orders/${id}`),
  createOrder: (order: unknown, confirm: boolean) =>
    printfulFetch<PfOrder>(`/orders?confirm=${confirm ? "true" : "false"}`, {
      method: "POST",
      body: order,
    }),
};

export type PrintfulClient = typeof printful;
