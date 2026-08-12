# Safe Transaction & Payment Flow

## Transaction System Overview

**Principle**: Direct payment between buyer and seller (NOT Escrow)
- Avoids complex financial/legal issues
- Simple matching service only
- Both parties coordinate payment themselves

---

## Transaction Flow

### Phase 1: Agreement
```
1. Buyer views product
2. Buyer contacts seller
3. Both agree on: Price, Condition, Meetup Time/Place
4. System shows: "Ready to Arrange Meetup"
```

### Phase 2: Matching
```
5. Seller confirms: "I'm ready"
6. Buyer confirms: "I'm ready"
7. System shows: "Matched - Arrange Details"
8. Both can message and coordinate
```

### Phase 3: Meetup & Verification
```
9. Both arrive at agreed location
10. Buyer inspects using provided checklist
11. Buyer verifies: Product matches description
12. Buyer decides: "I'll buy it" or "I'll pass"
```

### Phase 4: Payment & Handover
```
13a. SIMULTANEOUS TRANSFER:
     - Buyer: Initiates bank transfer (Amount agreed)
     - Seller: Shows proof of payment
     - Seller: Transfers device
     - Buyer: Confirms receipt

13b. ALTERNATIVE (CASH):
     - Buyer: Inspects money
     - Seller: Hands over device
     - Both confirm satisfaction
```

### Phase 5: Completion
```
14. Buyer reviews seller (1-5 stars)
15. Seller reviews buyer (1-5 stars)
16. Transaction marked as: "Completed"
```

---

## Payment Options

### 1. Bank Transfer (PromptPay/Online Banking)
**For Simultaneous Transfer**:
- [ ] Buyer opens banking app
- [ ] Enters seller's phone/ID for PromptPay
- [ ] Enters agreed amount
- [ ] Waits for confirmation
- [ ] Seller shows proof of payment on phone
- [ ] Seller hands over device
- [ ] Buyer confirms receipt

### 2. Cash Payment
**On-the-Spot Payment**:
- [ ] Buyer brings exact cash
- [ ] Verify bills are genuine
- [ ] Inspect device
- [ ] Exchange: Money ↔ Device
- [ ] Both satisfied & leave

### 3. Partial Payment (Trust-based)
**If needed**:
- [ ] Buyer pays 50% deposit
- [ ] Device is "reserved" for buyer
- [ ] Seller delivers/holds device
- [ ] Buyer pays remaining 50% on meetup

---

## Safety Guidelines for Platform

### For Buyers
- [ ] Always meet in public place (BTS/MRT station, mall, police station)
- [ ] Bring someone you trust
- [ ] Do thorough inspection before payment
- [ ] Don't transfer money before seeing device
- [ ] Keep proof of payment/receipt
- [ ] Report suspicious activity immediately

### For Sellers
- [ ] Always verify buyer's identity
- [ ] Confirm payment before handing device
- [ ] Meet in public place
- [ ] Don't leave device with unconfirmed buyer
- [ ] Keep serial number records
- [ ] Take photo of buyer (optional security)

### Platform Responsibility
- [ ] Provide verification documents from seller
- [ ] Show buyer/seller ratings
- [ ] Enable messaging system
- [ ] Report system for scams
- [ ] Blacklist suspicious users
- [ ] Provide transaction templates

---

## Dispute Resolution (Simple)

### If Product Issue After Purchase

**Buyer Claims**:
- "Device doesn't match description"
- "Device stopped working after 1 day"
- "Damaged during shipment"

**Platform Actions**:
- [ ] Review seller's verification documents
- [ ] Check photos vs. buyer's report
- [ ] Check seller's history (Scam?/Trusted?)
- [ ] Recommend mediation between parties
- [ ] Suggest refund if seller agrees
- [ ] Can suspend seller if pattern of complaints

**Note**: Platform doesn't hold money, so can't force refunds.
- Strong recommendation to buyer: Meet in person & verify before paying
- Strong incentive for seller: Good reviews = more sales

---

## Status Tracking

### Transaction Statuses
```
📋 Inquiry → 🟡 Negotiating → 🟢 Matched → 
📍 Meeting Arranged → ✅ Completed → ⭐ Reviewed
```

### What System Tracks
- [ ] Message history between buyer/seller
- [ ] Agreement: Price, Condition, Meetup Time/Place
- [ ] Meetup confirmation from both parties
- [ ] Completion date
- [ ] Ratings & reviews from both sides
- [ ] Dispute reports (if any)

---

## Fraud Prevention

### Red Flags for Sellers
- ❌ Multiple requests for personal info before payment
- ❌ Offering to ship device before receiving money
- ❌ Discrepancies in product photos vs. offered spec
- ❌ Extremely low price (too good to be true)
- ❌ Unverified account with no history

### Red Flags for Buyers
- ❌ Seller unwilling to do video call/meet in person
- ❌ Seller asking for payment method outside platform
- ❌ Serial number doesn't match device specs
- ❌ Test results/diagnostics seem fake
- ❌ Seller pushing for quick decision

### System Protections
- [ ] Verification badge for trusted sellers
- [ ] Rating system visible to all
- [ ] Reported scams published (with details)
- [ ] IP blocking for repeated scammers
- [ ] Seller accountability for misrepresentation
