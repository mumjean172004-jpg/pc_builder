# Location Matching & Smart Search

## Smart Matching System

### User Location Preference

**Buyers can**:
- Select home province
- Select multiple provinces if interested
- Set search radius (e.g., 10km, 30km, 50km)
- Filter by district or specific area

**Sellers can**:
- Set selling province
- Can sell to nearby areas (selectable)
- Multiple selling points (optional)

### Location-Based Filtering

```
Search Results Structure:
- Show seller's province first
- Show distance from buyer (estimated km)
- Sort by: Nearest, Price, Newest
```

---

## Enhanced Search Features

### Search Types

1. **Product Search**
   - By Device Type (Computer/Laptop/Notebook/Phone)
   - By Brand (Intel, AMD, Apple, Samsung, etc.)
   - By Model (e.g., MacBook Pro 14", RTX 4080)
   - By Specification (RAM, Storage, GPU, etc.)

2. **Location Search**
   - By Province/State
   - By District/Area
   - By Distance Radius

3. **Filter Options**
   - **Price Range**: Min - Max Baht
   - **Condition**: New/Like New/Good/Fair/Poor
   - **Seller Type**: Verified/Partial/New
   - **Device Type**: Desktop/Laptop/Notebook/Phone
   - **Brand**: Multi-select
   - **Specifications**: 
     - RAM (4GB, 8GB, 16GB, 32GB+)
     - Storage (128GB, 256GB, 512GB, 1TB+)
     - GPU (Integrated, GTX, RTX, Apple Silicon)
     - Display Size (13", 14", 15", 17")

---

## Search Result Display

### Information Shown
```
[Seller Province] [Distance] 
Product Title
Price: ฿X,XXX
Condition: [Status]
Seller: [Name] [Verification Badge]
Updated: X days ago
```

### Sorting Options
- [ ] Nearest (Distance)
- [ ] Latest (Newest Post)
- [ ] Price (Low to High / High to Low)
- [ ] Most Viewed
- [ ] Best Rated

---

## Product Listing Form

When Seller Posts:

### Step 1: Basic Info
- [ ] Device Type (Select: Computer/Laptop/Notebook/Phone)
- [ ] Brand (Dropdown)
- [ ] Model (Text/Autocomplete)
- [ ] Year (Dropdown)

### Step 2: Specifications
- [ ] CPU/Processor
- [ ] GPU/Graphics
- [ ] RAM
- [ ] Storage
- [ ] Display Size (if applicable)
- [ ] Battery Health (if applicable)

### Step 3: Condition
- [ ] Condition Level (New/Like New/Good/Fair/Poor)
- [ ] Included Items (Charger/Cable/Box/etc.)
- [ ] Damage/Issues (None/Minor/Moderate/Severe)

### Step 4: Location & Price
- [ ] Seller Province (Required)
- [ ] Seller District (Optional)
- [ ] Price (Baht)
- [ ] Willing to meet at: [Provinces]

### Step 5: Verification Documents
- [ ] Serial Number
- [ ] Photos (4+ angles)
- [ ] Test Results (Screenshots)
- [ ] Warranty Info (if applicable)

---

## Matching Algorithm

```
Calculate Match Score:
- Product specifications match: 40%
- Price within range: 30%
- Location proximity: 20%
- Seller verification: 10%

Display products with highest match score first
```

---

## Distance Calculation

```
Feature: "Find Near Me"
- Detect buyer's province
- Show products within selected radius
- Suggest nearby areas with products
```

---

## Search Behavior Examples

### Example 1: Exact Match ✓
- User searches: "RTX 4080"
- Show: RTX 4080 only (don't show RTX 5060)
- Show nearby sellers in user's province first

### Example 2: Price Range
- User searches: "Gaming Laptop ฿30,000-50,000"
- Show: All gaming laptops in that price range
- Sort by nearest location

### Example 3: Specification Search
- User searches: "16GB RAM, 512GB SSD, within 50km"
- Show: All devices matching criteria in proximity
- Group by distance

---

## NOT Showing Products

❌ **Don't show** if:
- User specifically searched for Model X but result is Model Y (even if similar)
- User set budget ฿30,000 but result is ฿35,000+ (unless they confirm)
- User set distance radius to 10km but seller is 50km away (unless they search again)
