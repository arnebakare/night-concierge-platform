import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { sendClientRetentionMessage } from "@/lib/actions/management-actions";
import type { RetentionClient } from "@/lib/data/app";

export function RetentionClientCard({ client }: Readonly<{ client: RetentionClient }>) {
  const message = buildRetentionMessage(client.name);
  const dormantLabel = client.days_since_booking === null ? "No bookings yet" : `${client.days_since_booking} days since last booking`;
  const mailtoHref = client.email
    ? `mailto:${client.email}?subject=${encodeURIComponent("A note from your Marbella concierge")}&body=${encodeURIComponent(message)}`
    : "";

  return (
    <LuxuryCard>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold">{client.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{dormantLabel}</p>
          {client.last_outreach_at && <p className="mt-1 text-xs text-champagne-300">Last contacted {new Date(client.last_outreach_at).toLocaleDateString()}</p>}
        </div>
        <span className="rounded-full border border-champagne-700/50 px-2 py-1 text-xs text-champagne-100">{client.vip_level}</span>
      </div>

      <div className="mt-4 rounded-md border border-champagne-700/30 bg-ink-950/50 p-3 text-sm text-muted-foreground">
        {message}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <form action={sendClientRetentionMessage}>
          <input type="hidden" name="clientId" value={client.id} />
          <input type="hidden" name="channel" value="WHATSAPP" />
          <input type="hidden" name="destination" value={client.phone} />
          <input type="hidden" name="message" value={message} />
          <Button type="submit" className="w-full" disabled={!client.phone}>
            <MessageCircle className="size-4" />
            Send WhatsApp
          </Button>
        </form>
        <form action={sendClientRetentionMessage}>
          <input type="hidden" name="clientId" value={client.id} />
          <input type="hidden" name="channel" value="EMAIL" />
          <input type="hidden" name="destination" value={client.email ?? ""} />
          <input type="hidden" name="message" value={message} />
          <Button type="submit" variant="secondary" className="w-full" disabled={!client.email}>
            <Mail className="size-4" />
            Send email
          </Button>
        </form>
      </div>

      {mailtoHref && (
        <Button asChild variant="ghost" className="mt-2 w-full">
          <a href={mailtoHref}>Open email app instead</a>
        </Button>
      )}
    </LuxuryCard>
  );
}

export function buildRetentionMessage(name: string) {
  const firstName = name.split(" ").filter(Boolean)[0] || name;
  return `Hi ${firstName}, we would love to host you again in Marbella. If you are planning a night out, a table, guestlist, or something more private, message us here and we will arrange it personally.`;
}
