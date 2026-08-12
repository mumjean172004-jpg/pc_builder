# 🔍 Marketplace Listing Checks

This note explains how second-hand product listings are analyzed for fraudulent indicators before being approved or updated.

* **Source File**: `03_backend/controllers/productController.js` (thin wrapper) → `03_backend/services/antiFraudService.js` (pure scoring logic, unit tested — see `03_backend/__tests__/antiFraudService.test.js`)
* **Trigger Endpoint**: `POST /api/products` & `PUT /api/products/:id`

---

## 🛡️ Anti-Fraud Flagging Logic

When a user posts or updates a marketplace listing, the backend runs evaluation checks (`evaluateSuspicion`, which delegates scoring to `scoreListing()`). If suspicious flags are raised, it logs these reasons in a JSON array inside the `suspicious_reasons` database column and computes a `suspicious_score`. **The score is NOT capped at 100** — if both rules below trigger, it reaches `160` (70+90) as-is; confirmed by unit test, don't assume a 0-100 clamp exists anywhere in the code.

### 1. Catalog Reference Price Matching (Underpriced Checks)
To prevent bait-and-switch scams or listing values too good to be true:
- **Rule**: Compare the product's selling price against the MSRP catalog reference price (`parts.price`) based on its `condition`.
- **Condition Floors**:
  - `new`: Minimum price must be at least **65%** of MSRP (`floor = part.price * 0.65`).
  - `used_90`: Minimum price must be at least **50%** of MSRP (`floor = part.price * 0.50`).
  - `used_80`: Minimum price must be at least **40%** of MSRP (`floor = part.price * 0.40`).
  - `used_70`: Minimum price must be at least **30%** of MSRP (`floor = part.price * 0.30`).
- **Action**: If `price < floor`, `suspicious_score` increases by **`+70`** and the reason is recorded:
  - *"Price is unusually low compared with catalog reference price (X%)."*

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
