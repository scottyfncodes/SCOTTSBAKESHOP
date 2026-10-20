// Lists the EXISTING products in your Printful store (read-only), so you can
// pick the hoodie, T-shirt and hat IDs for PRINTFUL_PRODUCT_IDS.
// Usage: PRINTFUL_API_TOKEN=... [PRINTFUL_STORE_ID=...] npm run printful:products
const token = process.env.PRINTFUL_API_TOKEN;
if (!token) {
  console.error("Set PRINTFUL_API_TOKEN first.");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${token}` };
if (process.env.PRINTFUL_STORE_ID) headers["X-PF-Store-Id"] = process.env.PRINTFUL_STORE_ID;

async function get(path) {
  const res = await fetch(`https://api.printful.com${path}`, { headers });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${json?.error?.message ?? json?.result}`);
  return json.result;
}

if (!process.env.PRINTFUL_STORE_ID) {
  try {
    const stores = await get("/stores");
    console.log("Stores:");
    for (const s of stores) console.log(`  ${s.id}\t${s.name}\t(${s.type})`);
    console.log("");
  } catch {
    /* store-level tokens can't list stores; that's fine */
  }
}

const products = await get("/store/products?limit=100");
console.log("ID\tVariants\tSynced\tName");
for (const p of products) {
  console.log(`${p.id}\t${p.variants}\t\t${p.synced}\t${p.name}${p.is_ignored ? "  (ignored)" : ""}`);
}
const guess = (re) => products.filter((p) => !p.is_ignored && re.test(p.name)).map((p) => `${p.id} ${p.name}`);
console.log("\nLikely matches:");
console.log("  Hoodie: ", guess(/hood/i).join(" | ") || "none");
console.log("  T-shirt:", guess(/t-?shirt|tee/i).join(" | ") || "none");
console.log("  Hat:    ", guess(/hat|cap|beanie/i).join(" | ") || "none");
console.log("\nThen set PRINTFUL_PRODUCT_IDS=<hoodie>,<tshirt>,<hat> in Vercel.");
