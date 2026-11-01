// Shared between server and client components; no secrets here.

export interface Variant {
  /** Printful sync variant ID — what orders are placed against. */
  id: number;
  /** Printful catalog variant ID — used for shipping-rate quotes. */
  catalogVariantId: number;
  color: string | null;
  colorCode: string | null;
  size: string | null;
  /** Retail price in the smallest currency unit (cents). */
  price: number;
  currency: string;
  image: string | null;
  /** Every distinct product mockup Printful has for this variant. */
  images: string[];
  available: boolean;
}

export interface Product {
  /** Printful sync product ID. */
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  /** Product thumbnail plus every distinct variant picture, for the product page gallery. */
  images: string[];
  /** Our own photos for this product (public/products). */
  photos: string[];
  /** True when photos[0] is the main picture instead of the Printful mockup. */
  photosLead: boolean;
  currency: string;
  colors: { name: string; code: string | null }[];
  sizes: string[];
  variants: Variant[];
}

export type Catalog =
  | { status: "ok"; products: Product[] }
  | { status: "unconfigured" }
  | { status: "error" };

export interface CartLine {
  variantId: number;
  quantity: number;
}

export interface ShippingAddress {
  name: string;
  email: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  amount: number;
  currency: string;
  minDays?: number;
  maxDays?: number;
}
