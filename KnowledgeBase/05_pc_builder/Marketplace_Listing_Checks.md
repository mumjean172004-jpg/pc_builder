# 🔍 Marketplace Listing Checks

This note explains how second-hand product listings are analyzed for fraudulent indicators before being approved or updated.

* **Source File**: `03_backend/controllers/productController.js` (thin wrapper) → `03_backend/services/antiFraudService.js` (pure scoring logic, unit tested — see `03_backend/__tests__/antiFraudService.test.js`)
* **Trigger Endpoint**: `POST /api/products` & `PUT /api/products/:id`

---

## 🛡️ Anti-Fraud Flagging Logic

When a user posts or updates a marketplace listing, the backend runs evaluation checks (`evaluateSuspicion`, which delegates scoring to `scoreListing()`). If suspicious flags are raised, it logs these reasons in a JSON array inside the `suspicious_reasons` database column and computes a `suspicious_score`. **The score is NOT capped at 100** — if both rules below trigger, it reaches `160` (70+90) as-is; confirmed by unit test, don't assume a 0-100 clamp exists anywhere in the code.

### 1. Cross-Listing Reference Price Matching (Underpriced Checks)
To prevent bait-and-switch scams or listing values too good to be true:
- **Rule** (redesigned 2026-08-17, see below): Compare the product's selling price against a reference price based on its `condition`. There is no separate admin-controlled catalog anymore (`parts` table removed) — the reference price is now `AVG(price)` across **other active, approved listings of the exact same `brand` + `model`** already on the marketplace (`productController.getCrossListingReferencePrice`, excludes the listing being scored itself). If no other listing of that exact brand+model exists yet, the price-floor check is skipped entirely for this listing (same "no ground truth, don't guess" behavior as before — a brand-new model's first-ever listing is never flagged just for being first).
  - `products.original_price` (a seller-supplied "was" price, purely a display field) is **never** used as the reference price — it is self-reported and therefore not trustworthy as a fraud-detection input.
- **Condition Floors** (unchanged — only the reference price source changed):
  - `new`: Minimum price must be at least **65%** of the reference price.
  - `used_90`: Minimum price must be at least **50%** of the reference price.
  - `used_80`: Minimum price must be at least **40%** of the reference price.
  - `used_70`: Minimum price must be at least **30%** of the reference price.
- **Action**: If `price < floor`, `suspicious_score` increases by **`+70`** and the reason is recorded:
  - *"Price is unusually low compared with catalog reference price (X%)."*

> ⚠️ **History**: Before 2026-08-17 this reference price came from `parts.price`, an admin-controlled MSRP in a separate reference catalog. A prior architecture change (done outside this codebase's normal workflow) switched it to the seller's own self-reported `original_price` — a critical bug, since a seller could set `original_price` to anything and always score `0`, live-proven exploitable on a real listing. Cross-listing comparison (this version) closes that gap because the reference price is derived from *other people's* independently-set listings, not anything the current seller controls.

### 2. Serial Number Duplicate Checks
To prevent multiple fake listings using the same physical device or stolen product pictures:
- **Rule**: Search active marketplace listings (`status != 'sold'`) for matching serial numbers (`serial_number`).
- **Action**: If a duplicate active serial number exists on another non-sold listing, `suspicious_score` increases by **`+90`** and the reason is recorded:
  - *"Serial number already exists on another non-sold listing."*

---

## 🗳️ Listing Moderation States
Product listings have two main state columns:
* **`status`**: Current listing visibility (`'active'`, `'sold'`, `'paused'`).
* **`review_status`**: Moderation check result (`'approved'`, `'pending_review'`, `'rejected'`).

*Note: Listings with high suspicion scores are flagged for reviewer validation or hidden depending on status limits. By default, API lists only `approved` items unless filtered.*

**Review threshold**: `review_status` is set to `'pending_review'` when `suspicious_score >= 80` (confirmed in `productController.js`; do not assume 70 — an earlier version of this note implied 70 and was wrong).
