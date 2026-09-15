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
META_GRAPH_API_VERSION=v26.0
META_APP_SECRET=your-meta-app-secret
META_WEBHOOK_VERIFY_TOKEN=a-long-random-value-you-create
META_ACCESS_TOKEN=your-system-user-access-token
META_WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
META_WHATSAPP_BUSINESS_ACCOUNT_ID=your-waba-id
META_INSTAGRAM_ACCOUNT_ID=your-instagram-professional-account-id
WHATSAPP_DESTINATION_NUMBER=+34...
```

Important:

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_` variable.
- Use the real Vercel URL for `NEXT_PUBLIC_APP_URL`.
- Meta credentials may be empty for UI-only preview testing. Production messaging requires them.

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

The Supabase project must have migrations `001` through `032` applied.

Required messaging migration:

```text
supabase/migrations/032_unified_meta_messaging.sql
```

Migration `032` adds the unified identities, conversations, messages, attachments, assignments, internal notes, RLS policies, and request links.

## 5. Deploy and verify

After the first deployment finishes:

1. Open `/api/health`.
2. Log in as admin and open `/admin/system`.
3. Submit a request from `/request`.
4. Confirm it appears in `/manager/requests`.
5. Confirm `/dashboard`, `/links`, and `/clients` work for a promoter.
6. Confirm WhatsApp attempts appear in `/notifications`.

## 6. Configure Meta

1. In the Meta developer app, add WhatsApp and Instagram products and connect the shared WhatsApp Business number plus the Instagram professional account.
2. Set the callback URL to `https://your-domain.com/api/webhooks/meta` and use the exact value of `META_WEBHOOK_VERIFY_TOKEN` as the verify token.
3. Subscribe WhatsApp to `messages`; subscribe the connected Instagram account/Page to messaging webhook events required by your app.
4. Create a System User token with the permissions granted during Meta app review. Put it in `META_ACCESS_TOKEN` (or use the channel-specific token variables).
5. Keep the app secret and access tokens server-side. Test one inbound and one staff-approved outbound message on each channel.

## 7. Production cleanup

Before using the app with real clients:

- Rotate or remove demo account passwords.
- Confirm demo mode is disabled.
- Confirm WhatsApp destination number is correct.
- Test one real mobile request flow from start to finish.
