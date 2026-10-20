import { z } from "zod";

export const MAX_LINES = 20;
export const MAX_QTY = 10;

export const cartSchema = z
  .array(
    z.object({
      variantId: z.number().int().positive(),
      quantity: z.number().int().min(1).max(MAX_QTY),
    }),
  )
  .min(1, "Your cart is empty")
  .max(MAX_LINES);

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const addressSchema = z.object({
  name: text(100),
  email: z.string().trim().email().max(200),
  address1: text(200),
  address2: optionalText(200),
  city: text(100),
  state: z.string().trim().max(50),
  zip: text(20),
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  phone: optionalText(30),
});

export const STATE_REQUIRED = new Set(["US", "CA", "AU"]);

export const shippingRequestSchema = z.object({ items: cartSchema, address: addressSchema });
export const checkoutRequestSchema = shippingRequestSchema.extend({
  shippingMethod: z.string().trim().min(1).max(50),
});
