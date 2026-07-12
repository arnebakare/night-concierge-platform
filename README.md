# Night Concierge Platform

Premium mobile-first nightlife concierge MVP for promoters, promoter managers, clients, and super admins.

## Stack

- Next.js App Router, TypeScript, React
- Supabase Auth, Postgres, RLS
- Tailwind CSS with shadcn-style primitives
- React Hook Form and Zod
- Server Actions / route handlers
- Twilio WhatsApp notifications
- QR promoter links

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill in:

```bash
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3001
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
WHATSAPP_DESTINATION_NUMBER=whatsapp:+34...
```

4. Apply Supabase migration and seed:

```bash
supabase db reset
```

Or apply every file in `supabase/migrations` in numeric order, then run `supabase/seed/seed.sql`.

Detailed Dashboard and CLI instructions are in `docs/migrations.md`.

5. Start locally:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
```

## Demo Accounts

Seeded accounts use password `password123`.

- `admin@night.test`
- `julia@casanis.es`
- `julia2@casanis.es`
- `client@night.test`

## Core URLs

- Public request: `/request`
- Promoter link: `/p/julia-la-plage-casanis`
- Magic link: `/m/magic-demo-token`
- Promoter dashboard: `/dashboard`
- Manager dashboard: `/manager`
- Admin dashboard: `/admin`
- Health check: `/api/health`
- WhatsApp delivery: `/notifications`
- Launch readiness: `/admin/system`

## Security Notes

- Public request creation uses the server-side service role and never exposes the service key to the browser.
- RLS is enabled on every application table.
- Client users do not receive policies for `client_notes`; internal notes remain staff-only.
- Staff mutations should call shared authorization helpers and write to `audit_logs` for sensitive changes.
- WhatsApp attempts are always stored in `whatsapp_notifications` as `SENT` or `FAILED`.

## Production Deployment

Deploy to Vercel, configure the same environment variables, and set Supabase Auth redirect URLs:

- `https://your-domain.com/auth/callback`
- `https://your-domain.com/login`

Use separate Supabase projects for preview and production.

Detailed Vercel instructions are in `docs/vercel-deployment.md`.

### Launch checklist

- Set `NEXT_PUBLIC_DEMO_MODE=false` in production.
- Configure all Supabase and Twilio secrets in Vercel, never in client-side variables.
- Apply migrations `001` through `006` to the production Supabase project.
- Set the production URL in `NEXT_PUBLIC_APP_URL` and Supabase Auth redirect URLs.
- Configure the WhatsApp destination from the manager settings screen.
- Verify `/api/health`, public request submission, WhatsApp delivery, and each role dashboard.
- Rotate seed passwords or avoid running demo seed data in production.
