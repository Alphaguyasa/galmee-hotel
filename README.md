# Galmee Hotel

Never double-book a room again, and take bookings from your own website.

Part of **Galmee**, business systems for Ethiopian businesses, by Alpha. Mobile-first PWA in Amharic, Afaan Oromo and English.

- Frontend: Next.js + Tailwind (PWA, offline)
- Backend: Supabase (shared project `galmee`), Postgres RLS per business
- Payments: Chapa (Telebirr, CBE Birr); SMS: AfroMessage; alerts: Telegram

## What it does

- Room board by day with status, cleaning and out-of-service rooms
- Reservations and walk-ins, check-in with ID capture, extra charges, payments and check-out totals
- Guest register, 7/14/30 day occupancy and income reports with CSV export, printable receipts
- A public one-page hotel website at `/h/<web-address>` with a booking request form
- Amharic, Afaan Oromo and English, Ethiopian calendar dates

## Run it locally

```sh
npm install
cp .env.example .env.local
npm run dev
```

## Environment

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (row level security protects the data) |

Secret keys for SMS, Telegram and payments live in Supabase Edge Function secrets, never in this repo.

## Checks

```sh
npm run lint
npm test
npm run build
```

Database migrations are in `supabase/migrations/`; the tenant isolation test is `supabase/tests/ht_rls_test.sql`.

## Deploy

Connect the repository to Vercel and set the two environment variables above.

See `ROADMAP.md` for progress.
