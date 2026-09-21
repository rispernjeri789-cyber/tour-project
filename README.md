# NO AGE Tour and Travel

A full-stack safari tour booking platform. Customers can browse parks and
tours, book a safari, pay by M-Pesa or cash, track their bookings and
trips, leave reviews, and manage their profile. Admins get a dashboard to
manage tours, bookings, payments, users, and notifications.

## Features

- Browse parks and tours, with per-person or per-day (vehicle hire)
  pricing and optional high-season rates
- Book a safari with a chosen departure and return date
- Pay by M-Pesa (STK push) or cash, with live payment status tracking
- Printable payment receipts
- Customer dashboard: bookings, trips, wishlist, reviews, notifications,
  payments history, profile and settings
- Admin dashboard: tours, bookings, payments, users, reviews and
  notifications management
- Email/password authentication with JWTs

## Tech stack

**Frontend**
- React
- TanStack Router / TanStack Query
- Tailwind CSS
- shadcn/ui components

**Backend**
- Flask
- SQLAlchemy + Flask-Migrate (Alembic)
- PostgreSQL
- Flask-JWT-Extended, Flask-Bcrypt
- Safaricom M-Pesa Daraja API (STK Push)

## Getting started

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL

### Frontend

```sh
npm install
npm run dev
```

### Backend

```sh
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET_KEY, SECRET_KEY, etc.
flask db upgrade
python run.py
```

### M-Pesa (optional, for testing payments)

1. Get a free sandbox app at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
   and set `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` in `backend/.env`.
2. Safaricom needs a publicly reachable URL to send payment callbacks to —
   use a tunnel (e.g. `cloudflared tunnel --url http://localhost:5000`) for
   local development and set `MPESA_CALLBACK_URL` accordingly.

See `backend/.env.example` for all available configuration options.
