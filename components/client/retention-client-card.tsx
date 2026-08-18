import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { sendClientRetentionMessage } from "@/lib/actions/management-actions";
import type { RetentionClient } from "@/lib/data/app";
import { inferLanguageFromCountry } from "@/lib/sales/funnel";

export function RetentionClientCard({ client }: Readonly<{ client: RetentionClient }>) {
  const language = client.preferred_language ?? inferLanguageFromCountry(client.country);
  const message = buildRetentionMessage(client.name, language);
  const dormantLabel = client.days_since_booking === null ? "No bookings yet" : `${client.days_since_booking} days since last booking`;
  const mailtoHref = client.email
    ? `mailto:${client.email}?subject=${encodeURIComponent("A note from your Marbella concierge")}&body=${encodeURIComponent(message)}`
    : "";

  return (
    <LuxuryCard className="retention-card client-row bg-white text-ink-950">
      <div className="grid gap-3 lg:grid-cols-[minmax(180px,0.8fr)_minmax(260px,1.2fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-ink-950 md:text-base">{client.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{dormantLabel}</p>
          {client.last_outreach_at && <p className="mt-1 text-xs text-champagne-700">Last contacted {new Date(client.last_outreach_at).toLocaleDateString()}</p>}
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">
          {message}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-64">
          <form action={sendClientRetentionMessage}>
            <input type="hidden" name="clientId" value={client.id} />
            <input type="hidden" name="channel" value="WHATSAPP" />
            <input type="hidden" name="destination" value={client.phone} />
            <input type="hidden" name="message" value={message} />
            <Button type="submit" className="w-full" size="sm" disabled={!client.phone}>
              <MessageCircle className="size-4" />
              WhatsApp
            </Button>
          </form>
          <form action={sendClientRetentionMessage}>
            <input type="hidden" name="clientId" value={client.id} />
            <input type="hidden" name="channel" value="EMAIL" />
            <input type="hidden" name="destination" value={client.email ?? ""} />
            <input type="hidden" name="message" value={message} />
            <Button type="submit" variant="secondary" className="w-full" size="sm" disabled={!client.email}>
              <Mail className="size-4" />
              Email
            </Button>
          </form>
        </div>
      </div>

      {mailtoHref && (
        <Button asChild variant="ghost" className="mt-2 w-full">
          <a href={mailtoHref}>Open email app instead</a>
        </Button>
      )}
    </LuxuryCard>
  );
}

export function buildRetentionMessage(name: string, language: "en" | "es" | "sv" = "en") {
  const firstName = name.split(" ").filter(Boolean)[0] || name;
  if (language === "es") return `Hola ${firstName}, espero que estés bien. Si vuelves pronto a Marbella, escríbeme por aquí y te ayudo con mesa, lista o un buen plan para la noche.`;
  if (language === "sv") return `Hej ${firstName}, hoppas allt är bra. Om du kommer till Marbella snart igen, skriv här så hjälper jag med bord, gästlista eller en bra plan för kvällen.`;
  return `Hi ${firstName}, hope you are well. If you are coming to Marbella again soon, message me here and I can help with tables, guestlist, or a good plan for the night.`;
}
