import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { CartError } from "./pricing";
import { PrintfulError } from "./printful";

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Maps known failures to safe customer-facing messages; never leaks internals. */
export function errorResponse(err: unknown, context: string) {
  if (err instanceof ZodError) return json({ error: "Please check the highlighted details and try again." }, 400);
  if (err instanceof CartError) return json({ error: err.message }, 422);
  if (err instanceof PrintfulError && !err.transient) {
    console.warn(`[${context}] Printful rejected request: ${err.message}`);
    return json({ error: "We couldn't calculate shipping to that address. Please double-check it." }, 422);
  }
  console.error(`[${context}]`, err instanceof Error ? err.message : err);
  return json({ error: "Something went wrong on our side. Please try again in a moment." }, 502);
}
