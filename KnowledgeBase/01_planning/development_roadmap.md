# Development Roadmap & Priority

## Project Phases Overview

```
Phase 1 (Foundation) → Phase 2 (Core Features) → Phase 3 (Enhancement)
```

---

## Phase 1: Foundation (Weeks 1-3)

### Priority 1.1: Database & Backend Setup
**Status**: ⏳ In Progress
- [x] Database schema designed (users, products, pc_parts)
- [ ] Connect database to Express server
- [ ] Create database connection pool
- [ ] Create migration scripts

**Files to Create**:
- `03_backend/config/database.js`
- `03_backend/migrations/init.sql`

**Estimated**: 3-4 days

---

### Priority 1.2: Authentication API
**Status**: ⏳ Not Started
- [ ] User registration endpoint: POST /api/auth/register
- [ ] User login endpoint: POST /api/auth/login
- [ ] JWT token implementation
- [ ] Password hashing (bcrypt)
- [ ] Protected routes middleware

**Files to Create**:
- `03_backend/routes/authRoutes.js`
- `03_backend/controllers/authController.js`
- `03_backend/middleware/auth.js`
- `03_backend/utils/jwt.js`

**Estimated**: 4-5 days

---

### Priority 1.3: Basic Product API (CRUD)
**Status**: ✅ Partially Complete
- [x] GET /api/products (list all)
- [x] GET /api/products/:id (single product)
- [ ] POST /api/products (create) - needs auth
- [ ] PUT /api/products/:id (update) - needs auth
- [ ] DELETE /api/products/:id (delete) - needs auth

**Files to Update**:
- `03_backend/routes/productRoutes.js`
- `03_backend/controllers/productController.js`

**Estimated**: 2-3 days

---

### Priority 1.4: Frontend Home Page
**Status**: ⏳ Not Started
- [ ] Design home page layout
- [ ] Create header/navigation component
- [ ] Create footer component
- [ ] Display featured products
- [ ] Responsive design

**Files to Create**:
- `04_frontend/components/Header.js`
- `04_frontend/components/Footer.js`
- `04_frontend/pages/Home.js`
- `04_frontend/css/responsive.css`

**Estimated**: 4-5 days

---

## Phase 2: Core Features (Weeks 4-6)

### Priority 2.1: Location & Matching System
**Depends on**: Phase 1 complete
- [ ] Add location fields to products table
- [ ] Create location endpoints
- [ ] Implement geolocation detection
- [ ] Create location filter in search

**Files to Create**:
- `03_backend/routes/locationRoutes.js`
- `03_backend/controllers/locationController.js`
- `02_database/migrations/add_location.sql`

**Estimated**: 4-5 days

---

### Priority 2.2: Search & Filter System
**Depends on**: Priority 2.1
- [ ] Create search endpoint: GET /api/products/search
- [ ] Implement filters (price, condition, brand, location)
- [ ] Implement sorting (price, date, distance)
- [ ] Create frontend search page

**Files to Create**:
- `04_frontend/pages/Search.js`
- `04_frontend/components/SearchBar.js`
- `04_frontend/components/FilterPanel.js`

**Estimated**: 4-5 days

---

### Priority 2.3: Seller Listing System
**Depends on**: Priority 2.1 + Auth
- [ ] Create product listing form
- [ ] Upload product images
- [ ] Store verification documents (serial number, photos)
- [ ] Manage seller listings (view, edit, delete)

**Files to Create**:
- `04_frontend/pages/SellerDashboard.js`
- `04_frontend/pages/ListProduct.js`
- `04_frontend/components/ImageUpload.js`
- `03_backend/routes/sellerRoutes.js`

**Estimated**: 5-6 days

---

### Priority 2.4: Messaging System
**Depends on**: Auth
- [ ] Create message endpoints
- [ ] Store conversations between buyer/seller
- [ ] Real-time messaging (optional: use WebSocket)
- [ ] Message notifications

**Files to Create**:
- `03_backend/routes/messageRoutes.js`
- `03_backend/models/Message.js`
- `04_frontend/components/ChatBox.js`

**Estimated**: 4-5 days

---

### Priority 2.5: Transaction & Matching Flow
**Depends on**: Messaging + Seller Listing
- [ ] Create transaction status tracking
- [ ] Implement buyer/seller agreement flow
- [ ] Create "Matched" status
- [ ] Add transaction history

**Files to Create**:
- `03_backend/routes/transactionRoutes.js`
- `04_frontend/pages/TransactionTracker.js`

**Estimated**: 3-4 days

---

## Phase 3: Enhancement Features (Weeks 7-8)

### Priority 3.1: Verification & Education
**Depends on**: Phase 2 complete
- [ ] Create education page with guides
- [ ] How to check serial numbers
- [ ] How to test system info
- [ ] Red flags guide
- [ ] Embed checklists in buyer/seller flow

**Files to Create**:
- `04_frontend/pages/Education.js`
- `04_frontend/components/ChecklistGuide.js`

**Estimated**: 3-4 days

---

### Priority 3.2: Product Comparison
**Depends on**: Phase 2 complete
- [ ] Create comparison endpoint
- [ ] Compare multiple products
- [ ] Display comparison table
- [ ] AI recommendations (optional)

**Files to Create**:
- `04_frontend/pages/Comparison.js`
- `04_frontend/components/ComparisonTable.js`
- `03_backend/routes/comparisonRoutes.js`

**Estimated**: 3-4 days

---

### Priority 3.3: Rating & Review System
**Depends on**: Transactions complete
- [ ] Create rating endpoint
- [ ] Display seller ratings
- [ ] Show product reviews
- [ ] Calculate average score

**Files to Create**:
- `03_backend/routes/reviewRoutes.js`
- `04_frontend/components/Rating.js`

**Estimated**: 2-3 days

---

### Priority 3.4: PC Builder Feature
**Depends on**: Phase 2 complete
- [ ] Create PC parts database
- [ ] Build PC selection interface
- [ ] Calculate total price
- [ ] Show compatibility notes
- [ ] Save builds

**Files to Create**:
- `05_pc_builder/components/PartSelector.js`
- `05_pc_builder/components/BuildSummary.js`
- `03_backend/routes/pcBuilderRoutes.js`

**Estimated**: 5-6 days

---

### Priority 3.5: User Dashboard
**Depends on**: Multiple features
- [ ] My listings
- [ ] Purchase history
- [ ] Selling history
- [ ] Saved favorites
- [ ] Profile management

**Files to Create**:
- `04_frontend/pages/UserDashboard.js`
- `04_frontend/components/ProfileCard.js`

**Estimated**: 4-5 days

---

## Testing & Deployment (Week 9)

### Testing
- [ ] Unit tests for API endpoints
- [ ] Integration tests
- [ ] Manual testing checklist

### Deployment
- [ ] Setup production database
- [ ] Deploy backend to server
- [ ] Deploy frontend
- [ ] Setup SSL/HTTPS
- [ ] Configure environment variables

---

## Summary Timeline

```
Week 1-3:  Phase 1 (Foundation)      ✅ Database, Auth, Basic CRUD, Home
Week 4-6:  Phase 2 (Core Features)   📍 Location, Search, Seller Dashboard, Messages
Week 7-8:  Phase 3 (Enhancements)    ⏳ Verification, Comparison, PC Builder, Dashboard
Week 9:    Testing & Deployment      ⏳ QA & Launch
```

---

## Quick Start for Next Steps

### Immediately (Today-Tomorrow):
1. **Connect Database** ← START HERE
   - Install MySQL or PostgreSQL
   - Create database schema
   - Update `03_backend/config/database.js`

### This Week:
2. **Build Authentication** ← HIGH PRIORITY
   - Register endpoint
   - Login endpoint
   - JWT middleware

### Next Week:
3. **Build Search & Location**
4. **Build Seller Dashboard**

---

## Resource Allocation

```
Backend Development:  60% of effort
Frontend Development: 30% of effort
Database:             10% of effort
```

## Technology Stack to Use

- **Backend**: Node.js + Express + PostgreSQL/MySQL
- **Frontend**: React.js (recommended) or Vanilla JS
- **Real-time**: Socket.io (for messaging)
- **Image Upload**: Multer (file handling)
- **Authentication**: JWT + bcrypt
- **Payment**: Bank transfer coordination (simple matching)

---

## Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Database connection issues | Use connection pooling, test early |
| Real-time messaging complexity | Start with simple polling, upgrade later |
| Large file uploads (images) | Implement file size limits, compression |
| Security vulnerabilities | Use OWASP guidelines, security testing |
| High data load | Implement caching, database indexing |
