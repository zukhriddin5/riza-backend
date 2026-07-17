# RIZA E-Commerce — Backend API

REST API for the RIZA furniture store: products, categories, orders, authentication, an admin panel, image uploads, and full bilingual (Uzbek / Russian) content.

Built with **NestJS 11**, **Prisma 7**, and **PostgreSQL**. Pairs with the [RIZA frontend](../riza-frontend).

---

## Tech stack

| Area | Tech |
|------|------|
| Framework | NestJS 11 (TypeScript, CommonJS) |
| Database | PostgreSQL (Neon) via Prisma 7 + `@prisma/adapter-pg` |
| Auth | JWT (`@nestjs/jwt`, Passport) + role-based guards |
| File storage | Cloudflare R2 / S3-compatible (`@aws-sdk/client-s3`) or local disk |
| Images | `sharp` (resize + WebP compression) |
| Validation | `class-validator` / `class-transformer` (global `ValidationPipe`) |

## Features

- **Products & categories** — full CRUD, unique server-generated slugs, many-to-many links.
- **Bilingual content** — every product/category stores Uzbek + Russian; storefront endpoints localize by `?lang=` with fallback.
- **Orders** — checkout with server-authoritative pricing, stock management, cancel/restock, admin mark-paid / mark-delivered.
- **Auth** — customers by phone, admins by email; JWT tokens, password reset.
- **Admin** — role-guarded endpoints for products, categories, orders, admins, and dashboard stats (monthly revenue, top sellers).
- **Image uploads** — ADMIN-only endpoint; images resized to ≤1200 px WebP and stored in R2 (prod) or local disk (dev).

## Money & rules

- All prices are **integer cents** (e.g. `59999` = \$599.99).
- The **server is authoritative** for prices, totals, shipping, and the buyer's identity (from the JWT, never the request body).
- Orders are immutable records; order items snapshot name/price at purchase time.

---

## Getting started

### Prerequisites
- Node.js 20+
- A PostgreSQL database (e.g. a free [Neon](https://neon.tech) project)

### 1. Install
```bash
npm install
```

### 2. Configure environment
Copy the example and fill in your values:
```bash
cp .env.example .env
```
See **Environment variables** below.

### 3. Set up the database
```bash
npx prisma migrate dev     # apply migrations
npx prisma generate        # generate the client (also runs on postinstall)
```

### 4. Run
```bash
npm run start:dev          # watch mode, http://localhost:3000
```

---

## Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `JWT_SECRET` | Long random string for signing tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `1d` |
| `FREE_SHIPPING_THRESHOLD` | Cents; orders ≥ this ship free (e.g. `50000`) |
| `SHIPPING_FEE` | Cents; flat fee below the threshold (e.g. `5000`) |
| `ADMIN_TELEGRAM` / `ADMIN_CARD_NUMBER` | Shown at checkout for card payments |
| `FRONTEND_URL` | Allowed CORS origin (your deployed frontend) |
| `STORAGE_DRIVER` | `local` (dev) or `s3` (prod) |
| `APP_URL` | Public URL of this API (for local image URLs) |
| `S3_ENDPOINT` `S3_REGION` `S3_BUCKET` `S3_ACCESS_KEY_ID` `S3_SECRET_ACCESS_KEY` `S3_PUBLIC_URL` | S3-compatible storage (R2/Spaces/S3), used when `STORAGE_DRIVER=s3` |

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run start:dev` | Dev server (watch) |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled app (`node dist/src/main`) |
| `npm run seed` | Seed sample data |
| `npm run lint` / `npm test` | Lint / unit tests |

---

## API overview

Public (storefront):
- `GET /categories/home-feed?lang=` — everything the home page needs in one call
- `GET /categories/:slug?lang=` — a category + its products
- `GET /products/all?lang=` — all active products (newest first)
- `GET /products/slug/:slug?lang=` — product detail
- `POST /users` — customer sign-up (phone) · `POST /auth/login` · `POST /auth/reset-password`

Authenticated:
- `GET /auth/me` · `POST /orders` · `GET /orders/mine` · `DELETE /orders/:id`

Admin (role-guarded):
- `GET /orders` · `PATCH /orders/:id/pay` · `PATCH /orders/:id/deliver`
- `POST/PATCH/DELETE /products` · `POST/PATCH/DELETE /categories`
- `POST /uploads/image` · `GET /stats/dashboard`
- `POST /users/admins` · `GET/PATCH/DELETE /users/admins/:id`

---

## Deployment (DigitalOcean App Platform)

- **Build command:** `npm install && npm run build`
- **Run command:** `npm run start:prod`
- Set all env vars in the dashboard (with `STORAGE_DRIVER=s3` + R2 keys, and `FRONTEND_URL` = your deployed frontend).
- The Neon database is migrated with `prisma migrate deploy`.

> Note: the entry point compiles to `dist/src/main.js` (because of imports outside `src/`), which is why `start:prod` runs `node dist/src/main`.
