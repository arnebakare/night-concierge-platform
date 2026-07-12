# Vercel deployment

This project is ready to run on Vercel as a standard Next.js App Router app.

## 1. Import the project

1. Push this project to GitHub.
2. In Vercel, choose **Add New Project**.
3. Import the GitHub repository.
4. Keep the framework preset as **Next.js**.

Use these defaults:

```text
Build Command: npm run build
Install Command: npm install
Output Directory: .next
Root Directory: ./
```

The existing `vercel.json` pins the deployment region to Frankfurt (`fra1`), which is appropriate for Spain/Europe usage.

## 2. Add environment variables

In Vercel, open **Project Settings -> Environment Variables** and add these for Production:

```env
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
WHATSAPP_DESTINATION_NUMBER=whatsapp:+34...
```

Important:

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_` variable.
- Use the real Vercel URL for `NEXT_PUBLIC_APP_URL`.
- If Twilio is not ready yet, leave the Twilio values empty only for preview testing. Production request notifications require them.

## 3. Configure Supabase Auth URLs

In Supabase, open **Authentication -> URL Configuration**.

Set **Site URL**:

```text
https://your-vercel-domain.vercel.app
```

Add **Redirect URLs**:

```text
https://your-vercel-domain.vercel.app/auth/callback
https://your-vercel-domain.vercel.app/login
```

If you later add a custom domain, add the same callback and login URLs for that domain too.

## 4. Confirm database migrations

The Supabase project must have migrations `001` through `006` applied.

Required final migration:

```text
supabase/migrations/006_rls_recursion_fix.sql
```

Without migration `006`, logged-in dashboards can hit RLS recursion errors.

## 5. Deploy and verify

After the first deployment finishes:

1. Open `/api/health`.
2. Log in as admin and open `/admin/system`.
3. Submit a request from `/request`.
4. Confirm it appears in `/manager/requests`.
5. Confirm `/dashboard`, `/links`, and `/clients` work for a promoter.
6. Confirm WhatsApp attempts appear in `/notifications`.

## 6. Production cleanup

Before using the app with real clients:

- Rotate or remove demo account passwords.
- Confirm demo mode is disabled.
- Confirm WhatsApp destination number is correct.
- Test one real mobile request flow from start to finish.
