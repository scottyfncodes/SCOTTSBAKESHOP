import { BUNDLE_PROMO, BUNDLE_PROMO_LEAD } from "@/lib/discount";

/** The quiet bundle-discount line shown near the shelf and in the cart. */
export function BundleNote({ className = "" }: { className?: string }) {
  return (
    <p className={`bundle-note ${className}`.trim()}>
      <em>{BUNDLE_PROMO_LEAD}</em> {BUNDLE_PROMO}
    </p>
  );
}
