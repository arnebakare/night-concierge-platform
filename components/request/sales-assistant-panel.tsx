import { CheckCircle2, Sparkles } from "lucide-react";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { CopyMessageButton } from "@/components/request/copy-message-button";
import { StatusSubmitButton } from "@/components/request/status-submit-button";
import { EditableMessageCard } from "@/components/request/editable-message-card";
import { updateRequestStatus } from "@/lib/actions/management-actions";
import type { ConciergeRequest, MessageTemplate } from "@/lib/types";
import { buildAvailabilityMessageFromTemplate, buildClientReplyFromTemplate, buildUpsellIdeas, findTemplate, inferLanguageFromCountry, nextSalesAction } from "@/lib/sales/funnel";

export function SalesAssistantPanel({ request, returnTo, templates = [] }: Readonly<{ request: ConciergeRequest; returnTo?: string; templates?: MessageTemplate[] }>) {
  const language = inferLanguageFromCountry(request.clients?.country);
  const availabilityMessage = buildAvailabilityMessageFromTemplate(request, findTemplate(templates, "venue_check", "en"));
  const clientReply = buildClientReplyFromTemplate(request, templates, language);
  const upsells = buildUpsellIdeas(request);

  return (
    <LuxuryCard className="sales-assistant space-y-4">
      <div className="flex items-start gap-3 border-b border-border/70 pb-3">
        <div className="rounded-md bg-champagne-300/15 p-2 text-champagne-200">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-champagne-300">Next step</p>
          <h3 className="mt-1 text-lg font-semibold">{nextSalesAction(request.status)}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Use a short message, then move the request forward.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <EditableMessageCard title="Ask venue" text={availabilityMessage} />
        <EditableMessageCard title="Reply client" text={clientReply} phone={request.clients?.phone} />
      </div>

      <div className="space-y-2 rounded-md bg-secondary/70 p-3">
        <p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="size-4 text-champagne-300" /> Follow-up ideas</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {upsells.map((idea) => (
            <div key={idea} className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-3 py-2 text-sm text-muted-foreground">
              <span>{idea}</span>
              <CopyMessageButton text={idea} label="Copy" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatusButton requestId={request.id} status="CONTACTED" label="Client replied" />
        <StatusButton requestId={request.id} status="PENDING" label="Asked venue" />
        <StatusButton requestId={request.id} status="CONFIRMED" label="Confirmed" primary />
        <StatusButton requestId={request.id} status="ARRIVED" label="Complete" returnTo={returnTo} />
      </div>
    </LuxuryCard>
  );
}

function StatusButton({
  requestId,
  status,
  label,
  primary,
  returnTo
}: Readonly<{ requestId: string; status: string; label: string; primary?: boolean; returnTo?: string }>) {
  return (
    <form action={updateRequestStatus}>
      <input type="hidden" name="requestId" value={requestId} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <StatusSubmitButton className="w-full" value={status} label={label} pendingLabel="Saving" variant={primary ? "default" : "secondary"} />
    </form>
  );
}
