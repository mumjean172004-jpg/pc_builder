/**
 * PC Builder Pro — Marketplace Anti-Fraud Scoring
 *
 * Pure scoring logic extracted from controllers/productController.js so it can be
 * unit tested without a live database connection. Behavior must stay IDENTICAL to
 * the original inline `evaluateSuspicion` implementation.
 *
 * See KnowledgeBase/05_pc_builder/Marketplace_Listing_Checks.md for the rule spec.
 */

const CONDITION_PRICE_FLOOR = {
  new: 0.65,
  used_90: 0.5,
  used_80: 0.4,
  used_70: 0.3,
};

/**
 * Score a marketplace listing for suspicious/fraud indicators.
 *
 * @param {Object} params
 * @param {number|null|undefined} params.catalogPrice - Reference price computed as the
 *   average asking price of OTHER active, approved listings of the same brand+model
 *   already on the marketplace (see `productController.js`'s `getCrossListingReferencePrice`).
 *   Never sourced from the seller's own self-reported `original_price` — that field is
 *   fully seller-controlled and made this check trivially bypassable when it was used
 *   as the reference (found and fixed 2026-08-17). Falsy (0/null/undefined, e.g. this is
 *   the first-ever listing of that brand+model) skips the price-floor check.
 * @param {string} params.condition - One of 'new' | 'used_90' | 'used_80' | 'used_70'.
 *   Unknown/missing conditions fall back to a 40% floor, matching the original
 *   `CONDITION_PRICE_FLOOR[condition] || 0.4`.
 * @param {number} params.price - The listing's asking price.
 * @param {boolean} params.hasDuplicateSerial - Whether an active (non-sold) listing
 *   with the same serial number already exists elsewhere in the system.
 * @returns {{score: number, reasons: string[]}} Suspicion score (NOT capped — can
 *   exceed 100 if multiple rules trigger) and the list of human-readable reasons.
 */
function scoreListing({ catalogPrice, condition, price, hasDuplicateSerial }) {
  const reasons = [];
  let score = 0;

  if (catalogPrice) {
    const floor = catalogPrice * (CONDITION_PRICE_FLOOR[condition] || 0.4);
    if (price < floor) {
      score += 70;
      reasons.push(`Price is unusually low compared with catalog reference price (${Math.round((price / catalogPrice) * 100)}%).`);
    }
  }

  if (hasDuplicateSerial) {
    score += 90;
    reasons.push('Serial number already exists on another non-sold listing.');
  }

  return { score, reasons };
}

module.exports = { scoreListing, CONDITION_PRICE_FLOOR };
