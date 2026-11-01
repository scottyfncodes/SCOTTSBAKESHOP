import { describe, expect, it } from "vitest";
import { merchFor } from "@/lib/merch";

describe("merchFor", () => {
  it("gives the live Printful products a storefront title, collection and design", () => {
    expect(merchFor("T-Shirt - Black")).toMatchObject({ title: "Gluten for Punishment Tee", category: "Apparel" });
    expect(merchFor("Unisex Hoodie")).toMatchObject({ title: "Gluten for Punishment Hoodie", category: "Apparel" });
    expect(merchFor("Hat")).toMatchObject({ title: "Let’s Get This Bread Dad Hat", category: "Headwear" });
    const mug = merchFor("Black Glossy Mug");
    expect(mug).toMatchObject({ title: "Two-Sided Bake Shop Mug", category: "Accessories" });
    expect(mug.designs.map((d) => d.slug)).toEqual(["lets-get-this-bread", "gluten-for-punishment"]);
  });

  it("falls back to the Printful name for products it doesn't know", () => {
    expect(merchFor("Tote Bag")).toEqual({ title: "Tote Bag", kind: null, category: null, designs: [], note: null });
  });
});
