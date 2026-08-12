> ⚠️ **DEPRECATED — DO NOT FOLLOW.** This describes an early PostgreSQL-based prototype of the backend. The project migrated to **MySQL/MariaDB** — see [[07_document/AI_Agent_Entry]] for the real, current local setup steps and [[07_document/Database_Schema]] for the actual schema. Kept here only for historical reference; it previously lived at `03_backend/POSTGRESQL_SETUP.md` where a new developer could mistake it for current instructions.

# PostgreSQL Setup Guide (historical, pre-MySQL-migration)

## Database Configuration
- **Host**: localhost
- **Port**: 5432 (default)
- **User**: postgres
- **Password**: Admin@1234
- **Database**: secondhand_pc

## How to Initialize

### Step 1: Remove old node_modules and package-lock.json
```powershell
cd 03_backend
Remove-Item -Recurse node_modules -Force
Remove-Item package-lock.json -Force
```

### Step 2: Install PostgreSQL packages
```powershell
npm install
```

### Step 3: Initialize Database
```powershell
node scripts/init-db.js
```

This will:
- Create database `secondhand_pc` if not exists
- Create tables: users, products, pc_parts

### Step 4: Start the server
```powershell
node server.js
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (returns JWT token)
- `GET /api/auth/profile` - Get current user profile (requires token)

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (requires auth)
- `PUT /api/products/:id` - Update product (requires auth)
- `DELETE /api/products/:id` - Delete product (requires auth)

## Testing with curl

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@test.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "password123"
  }'
```

### Get Products
```bash
curl http://localhost:3000/api/products
```

### Create Product (with token)
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Gaming Laptop",
    "category": "Laptop",
    "price": 50000,
    "description": "High-performance gaming laptop",
    "image": "laptop.jpg"
  }'
```

## Troubleshooting

### Connection Error
- Make sure PostgreSQL is running
- Check password in config/database.js
- Verify port 5432 is open

### Database Exists Error
- Database is already created, skip step 3 and go to step 4

### Auth Error
- Make sure token is included in Authorization header
- Format: `Authorization: Bearer <token>`
