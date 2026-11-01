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

  it("credits the artist behind each design", () => {
    const [design] = merchFor("Unisex Hoodie").designs;
    expect(design.artist).toEqual({ handle: "turdrodeo", url: "https://www.instagram.com/turdrodeo/" });
    expect(merchFor("Hat").designs[0].artist).toEqual({ handle: "kurt_player02", url: "https://www.instagram.com/kurt_player02/" });
  });

  it("falls back to the Printful name for products it doesn't know", () => {
    expect(merchFor("Tote Bag")).toEqual({ title: "Tote Bag", kind: null, category: null, designs: [], note: null });
  });
});
