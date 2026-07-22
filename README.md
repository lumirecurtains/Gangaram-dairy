# 🍛 Gangaram Dairy — Order Direct, Save on Fees

A food ordering platform that lets customers order directly from restaurants — no aggregator markups, better prices for everyone.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Hosting** | Vercel |
| **Auth** | Firebase Auth (Phone OTP) |
| **Database** | Firestore |
| **Payments** | Razorpay (with Route split-payments) |
| **Styling** | Tailwind CSS + CSS Variables |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Charts** | Recharts |

## Getting Started

### Prerequisites

- Node.js v18+
- A Firebase project (console.firebase.google.com)
- A Razorpay account (razorpay.com) — optional until Module 3

### Setup

```bash
# Clone the repository
git clone https://github.com/lumirecurtains/Gangaram-dairy.git
cd Gangaram-dairy

# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env.local

# Fill in your Firebase config in .env.local:
# - Client SDK keys from Firebase Console → Project Settings → Your apps
# - Admin SDK keys from Firebase Console → Project Settings → Service Accounts

# Deploy Firestore rules + indexes
npm install -g firebase-tools
firebase login
firebase deploy --only firestore

# Start development server
npm run dev
```

### Seed Demo Data

```bash
npm run seed:demo
```

Creates a demo restaurant "Gangaram Restaurant" with menu items.

### Bootstrap First Admin

```bash
npx tsx scripts/bootstrap-first-admin.ts --uid=<your-firebase-uid>
```

## Build Order

```
1 → 2 → 3 → 4 → 5 → 8 → 6 → 9 → 7 → 10 → 11 → 12 → 13 → 14 → 15
```

| Module | Description | Status |
|--------|-------------|--------|
| 1 | Database, Firestore Rules, Storefront Split | ✅ Done |
| 2 | Customer Frontend (Pages, Components, Contexts) | ✅ Done |
| 3 | Payments (Razorpay, Webhooks, Order API) | ✅ Done |
| 4 | Kitchen Dashboard + Order Status | ⏳ |
| 5 | Driver View + Invoice | ⏳ |
| 6 | Super Admin Platform | ⏳ |
| 7 | Merchant Onboarding | ⏳ |
| 8 | Auth & Role Management | ⏳ |
| 9 | Security Layer | ⏳ |
| 10 | Scalability Layer | ⏳ |
| 11 | SEO & Discovery | ⏳ |
| 12 | Notification System | ⏳ |
| 13 | Analytics Engine | ⏳ |
| 14 | Coupon & Loyalty System | ⏳ |
| 15 | AI Module (Optional) | ⏳ |

## Project Structure

```
src/
├── app/
│   ├── api/v1/           # API routes
│   │   ├── orders/
│   │   ├── payments/create-order/
│   │   └── webhooks/razorpay/
│   ├── cart/             # Cart page
│   ├── checkout/         # Checkout page
│   ├── h/[slug]/         # Restaurant detail page
│   ├── login/            # OTP Login page
│   ├── order/[id]/       # Order confirmation page
│   ├── profile/          # User profile page
│   └── track/[id]/       # Order tracking page
├── lib/
│   ├── api/              # Auth verification middleware
│   ├── components/       # Reusable UI components
│   │   ├── auth/         # OTPLogin
│   │   ├── cart/         # CartDrawer, CartItem, FloatingCartButton
│   │   ├── common/       # Skeleton, Toast, Modal, SearchBar, FilterChips
│   │   ├── layout/       # Navbar, BottomNav, Footer
│   │   ├── menu/         # MenuItemCard, CategoryTabs, PriceComparison
│   │   ├── order/        # OrderStatusTimeline, PaymentSummary, DriverCard
│   │   └── restaurant/   # RestaurantCard, RestaurantList
│   └── contexts/         # Auth, Cart, Theme context providers
├── lib/
│   ├── firebase.ts       # Client Firebase SDK
│   ├── firebaseAdmin.ts  # Admin Firebase SDK
│   ├── firestoreSchema.ts    # Typed interfaces
│   └── firestoreHelpers.ts   # Database helpers
scripts/
├── bootstrap-first-admin.ts  # First super-admin setup
└── seed-demo.ts               # Demo data seeder
```

## Environment Variables

All required variables are documented in [`.env.example`](./.env.example). Variables are added progressively as modules are built — never delete earlier ones.

## License

Private — Gangaram Dairy
