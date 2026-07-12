# Applying Supabase migrations

## Supabase Dashboard method

Use this when the project is not linked to the Supabase CLI.

1. Open the Supabase project dashboard.
2. Open **SQL Editor** and select **New query**.
3. Open `supabase/migrations/004_client_accounts.sql` locally and paste its complete contents into the query.
4. Select **Run** and confirm the query completes successfully.
5. Repeat with `supabase/migrations/005_public_rate_limits.sql`.
6. Restart the Next.js server and open `/admin/system` as a super admin.

Do not paste the service-role key into the SQL editor or browser console.

## Supabase CLI method

Use this for a project that will maintain migration history from this repository.

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The project reference is the first portion of the project URL: `https://PROJECT_REF.supabase.co`.

## Verification query

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'clients'
  and column_name = 'profile_id';

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('claim_client_profile', 'cancel_own_request', 'consume_public_request_slot');
```

The first query should return `profile_id`. The second should return all three functions.
