import { CheckCircle2, ClipboardList, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { CopyMessageButton } from "@/components/request/copy-message-button";
import { updateRequestStatus } from "@/lib/actions/management-actions";
import type { ConciergeRequest } from "@/lib/types";
import { buildAvailabilityMessage, buildClientReply, buildUpsellIdeas, nextSalesAction, whatsAppHref } from "@/lib/sales/funnel";

export function SalesAssistantPanel({ request, returnTo }: Readonly<{ request: ConciergeRequest; returnTo?: string }>) {
  const availabilityMessage = buildAvailabilityMessage(request);
  const clientReply = buildClientReply(request);
  const upsells = buildUpsellIdeas(request);

  return (
    <LuxuryCard className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-champagne-300/15 p-2 text-champagne-200">
          <Sparkles className="size-5" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-champagne-300">Next best action</p>
          <h3 className="mt-1 text-xl font-semibold">{nextSalesAction(request.status)}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Copy the right message, then move the request forward.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-champagne-700/30 bg-ink-900/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold"><ClipboardList className="size-4 text-champagne-300" /> Ask venue</p>
            <CopyMessageButton text={availabilityMessage} label="Copy" />
          </div>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{availabilityMessage}</p>
        </div>

        <div className="rounded-md border border-champagne-700/30 bg-ink-900/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold"><MessageCircle className="size-4 text-champagne-300" /> Reply client</p>
            <div className="flex gap-2">
              <CopyMessageButton text={clientReply} label="Copy" />
              <Button asChild variant="secondary" size="sm">
                <a href={whatsAppHref(request.clients?.phone, clientReply)} target="_blank" rel="noreferrer">Open</a>
              </Button>
            </div>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{clientReply}</p>
        </div>
      </div>

      <div className="space-y-2 rounded-md bg-secondary/70 p-3">
        <p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="size-4 text-champagne-300" /> Easy follow-up ideas</p>
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
      <Button className="w-full" type="submit" name="status" value={status} variant={primary ? "default" : "secondary"}>
        {label}
      </Button>
    </form>
  );
}
