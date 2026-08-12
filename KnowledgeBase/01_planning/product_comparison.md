# Product Comparison Feature

## Comparison Scenarios

### Scenario 1: Similar Products, Same Brand
**Example**: MacBook Pro 14" (2022 vs 2024 model)

Show comparison table:
```
| Spec | 2022 Model | 2024 Model | Difference |
|------|-----------|-----------|-----------|
| CPU | Apple M1 Pro | Apple M4 Pro | Faster 20% |
| RAM | 8GB | 8GB | Same |
| Storage | 256GB | 256GB | Same |
| Price | ฿45,000 | ฿55,000 | +฿10,000 |
| Performance | Good | Better | 2024 更新 |
| Verdict | Good value | Better performance | Choose 2024 if budget allows |
```

### Scenario 2: Different Brands, Similar Specs
**Example**: RTX 4080 Laptop (ASUS vs MSI vs Lenovo)

Show comparison table:
```
| Spec | ASUS | MSI | Lenovo |
|------|------|-----|--------|
| GPU | RTX 4080 | RTX 4080 | RTX 4080 |
| CPU | i7-13700H | i7-13700H | i7-13700H |
| Screen | 240Hz | 165Hz | 144Hz |
| Cooling | Good | Very Good | Good |
| Price | ฿60,000 | ฿55,000 | ฿58,000 |
| Best For | Speed | Cooling | Budget |
| Recommendation | Best performance | Best thermals | Best value |
```

### Scenario 3: Same Product, Different Conditions
**Example**: iPhone 13 Pro (Same model, different conditions)

Show comparison:
```
| Item | New | Like New | Good | Fair |
|------|-----|----------|------|------|
| Price | ฿35,000 | ฿32,000 | ฿28,000 | ฿24,000 |
| Condition | Sealed | Unused | Minor scratches | Visible wear |
| Battery | 100% | 95%+ | 90% | 80% |
| Screen | Perfect | Perfect | Minor imperfect | Minor damage |
| Warranty | Full | 1 Year | 6 Months | None |
| Recommendation | If budget allows | Best value | Good balance | Budget option |
```

---

## Comparison Rules

### What Can Be Compared

✅ **Can Compare**:
- Same device type (Laptop vs Laptop, not Laptop vs Desktop)
- Similar specs (within 1-2 generations)
- Same brand/different models
- Different brands with same specs
- Same product, different conditions
- Maximum 5 products at once

❌ **Can't Compare**:
- Different device types (Laptop vs Phone)
- Completely different specs (Old vs cutting-edge)
- Same device from same seller (would show same thing)

---

## Comparison Feature Location

### Where Users Access

1. **From Search Results**:
   - [ ] Checkbox "Compare" next to each product
   - [ ] Button "Compare Selected" when 2+ items checked
   - [ ] Shows comparison table

2. **From Product Detail Page**:
   - [ ] Button "Compare Similar Products"
   - [ ] Auto-suggests similar items
   - [ ] User selects which ones to compare

3. **Comparison Page URL**:
   - `/compare?product_ids=1,2,3,4`

---

## Comparison Table Structure

### Header Information
```
[Product 1 Image] | [Product 2 Image] | [Product 3 Image]
[Product Title] | [Product Title] | [Product Title]
[Price] ฿X | [Price] ฿Y | [Price] ฿Z
[Seller] | [Seller] | [Seller]
[Condition] | [Condition] | [Condition]
```

### Specification Section
```
CPU/Processor
GPU/Graphics Card
RAM
Storage
Display/Screen
Battery (if applicable)
Weight
Ports
Operating System
```

### Comparison Summary
```
Best For Gaming: [Product Name] → [Why]
Best For Business: [Product Name] → [Why]
Best Value: [Product Name] → [Why]
Best Performance: [Product Name] → [Why]
```

### Action Buttons
```
[View Details] | [View Details] | [View Details]
[Contact Seller] | [Contact Seller] | [Contact Seller]
[Add to Wishlist] | [Add to Wishlist] | [Add to Wishlist]
```

---

## AI-Powered Recommendations

### Comparison Analysis
- Highlight main differences in **bold**
- Show performance improvement percentage (if applicable)
- Calculate value/performance ratio
- Suggest "Best Choice" based on buyer's implied needs

### Example AI Output
```
🔍 Analysis:
- RTX 4080 is 30% faster than RTX 3080
- Price difference: +฿15,000
- Performance per Baht: RTX 3080 is better value
- Recommendation: Choose RTX 3080 unless you need cutting-edge performance

⚡ Performance Tier:
- Entry Level: RTX 3060 ✓
- Mid-Range: RTX 3080 ✓ [BEST VALUE]
- High-End: RTX 4080 [BEST PERFORMANCE]
```

---

## Filter Applied in Comparison

When user compares, platform should consider:
- [ ] Seller location (prefer nearby)
- [ ] Seller rating (prefer verified)
- [ ] Product condition (prefer better condition)
- [ ] Price (show price difference clearly)
- [ ] Availability (show "In Stock" status)

---

## Sharing Comparisons

### Share Features
- [ ] Copy comparison link
- [ ] Share on social media (as image)
- [ ] Download comparison as PDF
- [ ] Email comparison link

### Comparison Link Format
```
secondhandpc.com/compare?items=5,12,24&selected=12
```

Shows: Products 5, 12, 24 with product 12 highlighted
