// Fails if anything secret-looking ended up in the browser bundle.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = ".next/static";
const patterns = [
  /sk_(live|test)_[A-Za-z0-9]{8,}/,
  /rk_(live|test)_[A-Za-z0-9]{8,}/,
  /whsec_[A-Za-z0-9]{8,}/,
  /STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|PRINTFUL_API_TOKEN|PRINTFUL_WEBHOOK_SECRET/,
  /api\.printful\.com/,
];
const secretValues = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "PRINTFUL_API_TOKEN", "PRINTFUL_WEBHOOK_SECRET"]
  .map((k) => process.env[k])
  .filter((v) => v && v.length >= 8);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

let bad = 0;
let files = 0;
for (const file of walk(root)) {
  if (!/\.(js|css|html|json|txt|map)$/.test(file)) continue;
  files++;
  const text = readFileSync(file, "utf8");
  for (const re of patterns) if (re.test(text)) { console.error(`✗ ${file} matches ${re}`); bad++; }
  for (const v of secretValues) if (text.includes(v)) { console.error(`✗ ${file} contains a secret env value`); bad++; }
}
if (bad) process.exit(1);
console.log(`✓ No secrets found in ${files} client bundle files.`);
