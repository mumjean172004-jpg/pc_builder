# Manual QA Checklist — Prioritized

Generated: 2026-08-12, after the feature-completion pass that closed 5 partially-built modules (wishlist, build social interactions, change password, order dispute filing, admin parts catalog) and a full DB schema audit. Companion to [[06_testing/test_case.md]] (the earlier automated run) — this list is manual-QA-oriented and includes the areas automated/unit tests deliberately don't cover.

**How to use:** work top-down. P0 items are "if this is broken, the demo/presentation breaks" — verify these first. P1 are important but recoverable. P2 are polish/edge cases.

---

## P0 — Critical (verify before any demo/presentation)

| # | Area | Test | Expected |
|---|---|---|---|
| 1 | Auth | Register with email, register with phone, register with neither | Email/phone: succeeds. Neither: blocked client-side with a clear error |
| 2 | Auth | Login with email as identifier | Succeeds |
| 3 | Auth | Login with **username** as identifier | **Currently fails** — login only matches `email`/`phone` columns (`authController.js` login query), not `username`. This is existing, by-design behavior (matches the login form's own label "อีเมล หรือ เบอร์โทรศัพท์"), not a bug — but confirm this is the intended UX before presenting, since it can look like "login is broken" if the presenter forgets and types a username |
| 4 | Wishlist | Add product to wishlist from `product-detail.html`, then check it appears in `profile.html` → รายการที่ถูกใจ tab | Appears; remove button works |
| 5 | Wishlist | Add the same product twice (double-click / add via two tabs) | No error — endpoint is idempotent (`INSERT IGNORE`, fixed this session from a SQLite-syntax bug that 500'd on first real use) |
| 6 | PC Builder | Socket mismatch, RAM type mismatch, PSU wattage error, GPU-length-vs-case error | Each blocks/warns as documented in [[05_pc_builder/PC_Builder_Compatibility]] — covered by unit tests (`__tests__/compatibilityService.test.js`), but re-verify visually in the actual builder UI since the icon/UI layer isn't unit-tested |
| 7 | Marketplace anti-fraud | List an item below the price floor for its condition; list a duplicate serial number | Flagged to `pending_review` — covered by unit tests, re-verify the **threshold value**: it's `score >= 80`, not 70 (KnowledgeBase docs previously implied 70 — see [[05_pc_builder/Marketplace_Listing_Checks]], needs reconciling) |
| 8 | Order state machine | Full booking lifecycle: pending → waiting_verification (slip upload) → paid → shipped → completed | **Not unit-tested** (tightly coupled to DB/socket.io in `bookingController.js`, extraction refactor judged too risky this session) — this is the single highest-value manual regression area. Also verify: cancellation from each valid pre-completed state restores the product to `active`; the buyer-only vs seller-only status-change restrictions. Order creation itself (booking → pending) was exercised end-to-end (see #9, #11 below) |
| 9 | Order dispute filing | From an active order's chat room (inbox.html), file a dispute with a reason | ✅ **Verified end-to-end 2026-08-12**: created a real order via the API, opened it as the buyer in `inbox.html`, clicked "แจ้งปัญหา / เปิดข้อพิพาท", filled and submitted the reason. Order flipped to `disputed`, status badge updated, room list showed a "มีข้อพิพาท" badge, a system chat message logged the reason. No console errors. (Admin-side pickup of the dispute in the "จัดการข้อพิพาท" tab was not separately re-verified this pass, but that tab itself was unchanged this session.) |
| 10 | Admin auth | Non-admin user hits any `/api/admin/*` route | 403, not a crash |
| 11 | **Order total price (multi-item)** | Book 2+ products from the **same seller** in one order | ✅ **Bug found and fixed 2026-08-12**: `bookingController.js`'s `createBooking` summed `product.price` values with plain `+` (`sellerProducts.reduce((sum, p) => sum + p.price, 0)`). Since `mysql2` returns `DECIMAL` columns as **strings**, not numbers, `0 + "4000.00"` produced the string `"04000.00"` instead of the number `4000` — visible as a mangled "฿04000.00" total in the order's system chat message, and would have produced garbage (e.g. `"04000.001500.00"`) for a 2-item order. Fixed by wrapping in `Number(p.price)`. Verified via direct API test: 2 items (฿4,000 + ฿1,500) now correctly total `5500`. Re-verify visually in the actual chat UI for a multi-item cart checkout, since this was only confirmed via raw API response so far, not the rendered chat bubble |

## P1 — Important

| # | Area | Test | Expected |
|---|---|---|---|
| 11 | Change password | Wrong current password | Clean 401 error shown near the form — **does not force-logout the user** (the profile.html implementation deliberately bypasses the shared `API.put()` helper for this one call, since that helper treats any 401 as "session expired" and would otherwise silently log the user out instead of showing "current password incorrect") |
| 12 | Change password | Change password, then log out and log back in with the new password | Succeeds (verified this session via direct API test) |
| 13 | Build social | Like/unlike a build, add a comment, verify counts update | Confirmed working this session. Like-state on page load only syncs to true server state when you expand a build's comments (`GET /builds/:id` returns `user_liked`) — the top-level builds list endpoint doesn't include per-user like state, so the heart icon may not reflect "already liked" until you expand comments once. Note this as expected behavior, not a bug |
| 14 | Build edit/delete | Edit a build's name / public-private toggle; delete a build | Edit uses a `prompt()`/`confirm()` flow (minimal by design — full spec editing stays on the builder page). Delete requires confirmation and removes the card |
| 15 | Build comments | Two different users comment on the same public build | Each sees the other's comments after expanding (real `GET /builds/:id` history, not just session-local) |
| 16 | Admin parts catalog | Add a new catalog part (all required fields, then with a missing required field) | Success case adds and refreshes the list; validation blocks empty required fields with inline errors |
| 17 | Admin parts catalog | Look for edit/delete on an existing catalog part | **Not available — by design this session** (no backend PUT/DELETE route for `parts` exists; only add + list were built, per "happy path over perfection"). Don't be surprised it's missing; it's a known, documented gap, not an oversight |
| 18 | Dark mode | Every new feature (wishlist button, password form, dispute modal, admin parts tab) in dark mode | All use existing `var(--*)` tokens — should theme correctly. Admin panel is dark-only by design (separate design system), not theme-toggle-aware |
| 19 | KYC form | Submit seller KYC without uploading the ID photo | Blocked client-side ("กรุณาอัปโหลดรูปบัตรประชาชนก่อนส่งข้อมูล") — this whole form was rebuilt this session after being found broken (mismatched field ids from an interrupted prior edit); re-verify the full happy path once more since it's had the most churn |

## P2 — Polish / edge cases / known limitations

| # | Area | Note |
|---|---|---|
| 20 | Wishlist | No "you're not logged in" UX test done beyond code review — confirm clicking the wishlist heart while logged out redirects to login rather than erroring |
| 21 | Build comments | No pagination — a build with hundreds of comments will load them all in one `GET /builds/:id` call. Not a concern at demo scale |
| 22 | Dispute filing | No dispute-withdrawal or re-file flow — once `disputed`, only an admin can resolve it (existing admin dispute-resolution UI, unchanged this session) |
| 23 | `sendKycOtp()` in profile.html | Dead code — defined, never called (no UI wires to it). Confirmed harmless (doesn't throw, just unreachable). Leave as-is unless a future session builds out phone-OTP verification for real |
| 24 | Seller registration modal (`#seller-reg-modal`) | Not touched this session — still has its original inline styles/emoji-free-but-unstyled markup. Lower priority than the 5 features closed this session |
| 25 | `website_flowchart_v2.md` | Still describes checkout/admin as "(Planned)" in places — stale relative to actual implementation; update alongside other doc passes |

---

## What's covered by automated tests (don't re-derive manually — see `03_backend/__tests__/`)

45 Jest unit tests, run via `npm test` in `03_backend/`:
- `compatibilityService.test.js` — socket/RAM/GPU-length/PSU-wattage/cooler-height verdicts (15 tests)
- `antiFraudService.test.js` — price-floor boundaries per condition, duplicate-serial, combined-score-not-capped, real `>=80` pending-review threshold (14 tests)
- `authController.test.js` — register/login validation, bcrypt hash/compare round-trip, suspended-account lockout, JWT round-trip (16 tests)

**Not covered, and not planned to be** (see reasoning in each area above): the order status state machine, most of `authController.js`'s CRUD-only endpoints (profile/address/OTP), `calculateIntelligence`/`crossMatchMarketplace` in the compatibility service.

## Known documentation discrepancies to reconcile

- **Anti-fraud `pending_review` threshold**: actual code is `score >= 80`; [[05_pc_builder/Marketplace_Listing_Checks]] doesn't currently state a number, and an earlier session assumption of `70` was wrong. Update that doc to state `80` explicitly.
- **PSU headroom multiplier**: actual code uses `1.25x` estimated TDP as the safety-warning threshold; some earlier notes said `1.2x`. Update [[05_pc_builder/PC_Builder_Compatibility]] to say `1.25x`.
