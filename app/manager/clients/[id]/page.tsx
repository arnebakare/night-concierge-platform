import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { ClientNoteCard } from "@/components/client/client-note-card";
import { ClientNoteFilters } from "@/components/client/client-note-filters";
import { ClientNoteForm } from "@/components/client/client-note-form";
import { ClientEditForm } from "@/components/client/client-edit-form";
import { ClientBookingHistory } from "@/components/client/client-booking-history";
import { ClientFollowUpPanel } from "@/components/client/client-follow-up-panel";
import { ClientLifecycleTimeline } from "@/components/client/client-lifecycle-timeline";
import { ClientRelationshipSummary } from "@/components/client/client-relationship-summary";
import { requireProfile } from "@/lib/auth";
import { getActiveClubsForApp, getClientProfile, getTeamPromoters, getUsersForAdmin } from "@/lib/data/app";
import { formatCustomerCode } from "@/lib/concierge/phone";
import { formatEnum } from "@/lib/utils";

export default async function ManagerClientDetailPage({
  params,
  searchParams
}: Readonly<{ params: Promise<{ id: string }>; searchParams: Promise<{ visibility?: string; type?: string }> }>) {
  const [profile, { id }, filters] = await Promise.all([requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]), params, searchParams]);
  const [{ client, notes, aliases, history, outreach, tasks }, clubs, assignees] = await Promise.all([
    getClientProfile(id, filters),
    getActiveClubsForApp(),
    profile.role === "SUPER_ADMIN" ? getUsersForAdmin({ active: "active" }) : getTeamPromoters(profile.id)
  ]);
  const aliasNames = aliases.map((alias) => alias.name).filter((name) => name && name !== client.name);
  const confirmed = history.filter((item) => ["CONFIRMED", "ARRIVED"].includes(item.status)).length;
  const totalGuests = history.reduce((sum, item) => sum + item.guest_count, 0);

  return (
    <AppShell profile={profile} title={client.name} eyebrow="Full profile">
      <LuxuryCard className="client-row bg-white text-ink-950">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-champagne-700">{client.client_code ? `SKU ${client.client_code}` : formatCustomerCode(client.phone)}</p>
            <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950">{client.name}</h2>
            <p className="mt-2 text-sm text-slate-600">{client.phone} · {client.email ?? "No email"} · {client.instagram ?? "No Instagram"}</p>
            {aliasNames.length ? <p className="mt-2 text-xs text-slate-500">Also known as {aliasNames.slice(0, 4).join(", ")}</p> : null}
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="secondary">
              <a href={phoneHref(client.phone)}>Call</a>
            </Button>
            <Button asChild size="sm">
              <a href={whatsAppHref(client.phone)} target="_blank" rel="noreferrer">WhatsApp</a>
            </Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 overflow-hidden rounded-md border border-slate-200">
          <ProfileMetric label="VIP" value={formatEnum(client.vip_level)} />
          <ProfileMetric label="Confirmed" value={String(confirmed)} />
          <ProfileMetric label="Guests" value={String(totalGuests)} />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {formatEnum(client.status)} · {client.country || "Country not set"} · {(client.preferred_language ?? "en").toUpperCase()}
        </p>
      </LuxuryCard>
      <details className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-ink-950">
        <summary className="cursor-pointer text-sm font-semibold">Edit client details</summary>
        <div className="mt-3">
        <ClientEditForm client={client} role={profile.role} />
        </div>
      </details>
      <div className="mt-4">
        <ClientRelationshipSummary history={history} tasks={tasks} outreach={outreach} />
      </div>
      <div className="mt-4">
        <ClientFollowUpPanel clientId={client.id} tasks={tasks} assignees={assignees} />
      </div>
      <div className="mt-4">
        <ClientLifecycleTimeline history={history} notes={notes} aliases={aliases} outreach={outreach} tasks={tasks} />
      </div>
      <div className="mt-4">
        <ClientBookingHistory history={history} />
      </div>
      <div className="mt-4">
        <ClientNoteForm clientId={client.id} role={profile.role} clubs={clubs} />
      </div>
      <div className="my-4">
        <ClientNoteFilters action={`/manager/clients/${client.id}`} values={filters} />
      </div>
      <div className="space-y-3">
        {notes.length ? notes.map((note, index) => <ClientNoteCard key={`${note.note_type}-${index}`} note={note} />) : <LuxuryCard className="text-center text-sm text-muted-foreground">No notes match these filters.</LuxuryCard>}
      </div>
    </AppShell>
  );
}

function ProfileMetric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0 p-2.5">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function whatsAppHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

function phoneHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}
