This is a Next.js + Supabase starter for a public-facing court-booking experience, wired to use the existing `BookTheCourt` database shape as the source of truth.

## What is included

- Public landing page with SideQuest-style hero, gallery, FAQs, and venue content
- Availability board modeled after multi-court hourly scheduling
- Guest booking request flow backed by a Next.js API route
- Data model aligned to existing `BookTheCourt` tables such as `warehouses`, `courts`, `bookings`, `court_pricing_rules`, `booking_transactions`, and owner payment settings

## Getting started

1. Install dependencies if needed:

```bash
npm install
```

2. Add environment variables:

```bash
cp .env.example .env.local
```

Then set:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
BOOKING_WAREHOUSE_ID=...
```

3. Point the app at your existing `BookTheCourt` Supabase project by setting:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
BOOKING_WAREHOUSE_ID=...
```

`BOOKING_WAREHOUSE_ID` should be the `warehouses.id` value for the facility you want this deployment to display. If it is left empty, the app falls back to the first `booking_enabled` warehouse it finds.

4. Start the app:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Suggested next steps

- Add payment-proof upload using Supabase Storage
- Add admin authentication and booking verification workflows
- Replace the mock venue snapshot in `lib/site-data.ts` with live reads from your existing `warehouses`, `courts`, and `bookings` tables
