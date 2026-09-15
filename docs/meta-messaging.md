# Meta messaging setup

The concierge inbox uses Meta directly. It does not use Twilio, WhatsApp Web automation, or another inbox provider.

## Architecture

- `GET /api/webhooks/meta` handles Meta's verification challenge.
- `POST /api/webhooks/meta` validates `X-Hub-Signature-256` with `META_APP_SECRET` before parsing the payload.
- WhatsApp and Instagram payloads are normalized into `customer_identities`, `conversations`, `messages`, and `message_attachments`.
- A WhatsApp identity is matched to an existing CRM customer using the normalized phone number. New Instagram identities create a provisional CRM customer until staff merge or enrich the record.
- A customer's `owner_promoter_id` becomes the default conversation owner. Unknown customers stay in the manager's Unassigned queue.
- Staff replies use the official Graph API. Internal notes are stored only in `conversation_notes` and are never sent to Meta.
- AI can prepare text elsewhere in the product, but this inbox sends only when a signed-in staff member presses Send.

## Environment variables

Use `.env.example` as the source of truth. `META_ACCESS_TOKEN` can be shared by both configured products; channel-specific tokens override it. `META_GRAPH_API_VERSION` is configurable so upgrades do not require code changes.

The WhatsApp Phone Number ID is the Graph API sender identifier, not the displayed phone number. The Instagram Account ID must be the professional account/Page identifier expected by the Instagram Messaging API.

Instagram outbound messages use Meta's Instagram Login endpoint at `graph.instagram.com/{version}/me/messages`; WhatsApp messages use `graph.facebook.com/{version}/{phone-number-id}/messages`.

## Meta-side work

Create/configure a Meta developer app, connect the WhatsApp Business Account and one shared business number, connect the Instagram professional account, add the production webhook URL, subscribe message events, grant the required permissions to a System User token, complete business verification/app review where Meta requires it, and create approved WhatsApp templates for business-initiated conversations outside the customer-service window.

The outbound endpoint supports approved WhatsApp template sends programmatically (`templateName` and `languageCode`), while the first inbox UI deliberately exposes only human-authored replies.

## Database rollout

Apply `supabase/migrations/032_unified_meta_messaging.sql`. Existing request, CRM, club, note, and audit data remains in place. Historical Twilio-era tables remain untouched so migration history and old audit data are not destroyed; no runtime code depends on them.

After deployment, verify `/api/health`, `/admin/system`, `/inbox`, both webhook verification and signature rejection, inbound idempotency, owner auto-assignment, the Unassigned filter, private notes, outbound messages, and delivery/read receipts.
