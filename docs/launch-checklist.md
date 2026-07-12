# MVP launch acceptance checklist

## Configuration

- `npm run check:env` passes without printing secrets.
- `/admin/system` reports every item ready.
- Supabase redirect URLs include `/auth/callback` for production and preview domains.
- Demo mode is disabled in Vercel production.

## Public requests

- Submit public, promoter-link, and magic-link requests on a mobile viewport.
- Confirm fixed-club links cannot submit to another venue.
- Confirm the request appears in the manager inbox and promoter dashboard.
- Confirm six rapid requests to the same phone number trigger rate limiting.

## Roles and security

- Client users see only their linked requests and never see internal notes.
- Promoters see only their requests, clients, links, and allowed notes.
- Managers cannot modify promoters outside their team or clubs outside their access.
- Super admins can manage clubs, users, assignments, settings, and audit logs.

## Operations

- Status updates and promoter assignments appear in audit logs.
- Client cancellation works only before arrival, decline, or prior cancellation.
- WhatsApp success and failure records appear under `/notifications`.
- Failed WhatsApp delivery can be retried after provider configuration is corrected.
- CSV exports match the selected date and club filters.

## Release

- `npm run typecheck` and `npm run build` pass.
- Test promoter and manager accounts use non-demo passwords.
- Seed data is not loaded into production, or all seed passwords are rotated.
- Vercel production domain is reflected in `NEXT_PUBLIC_APP_URL`.
