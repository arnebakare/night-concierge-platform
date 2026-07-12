import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { ClientNoteCard } from "@/components/client/client-note-card";
import { ClientNoteFilters } from "@/components/client/client-note-filters";
import { ClientNoteForm } from "@/components/client/client-note-form";
import { ClientEditForm } from "@/components/client/client-edit-form";
import { requireProfile } from "@/lib/auth";
import { getActiveClubsForApp, getClientProfile } from "@/lib/data/app";

export default async function ManagerClientDetailPage({
  params,
  searchParams
}: Readonly<{ params: Promise<{ id: string }>; searchParams: Promise<{ visibility?: string; type?: string }> }>) {
  const [profile, { id }, filters] = await Promise.all([requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]), params, searchParams]);
  const [{ client, notes }, clubs] = await Promise.all([getClientProfile(id, filters), getActiveClubsForApp()]);

  return (
    <AppShell profile={profile} title={client.name} eyebrow="Full profile">
      <LuxuryCard>
        <p className="text-muted-foreground">{client.phone} · {client.email ?? "No email"} · {client.instagram ?? "No Instagram"}</p>
        <p className="mt-2 text-sm">VIP {client.vip_level} · {client.status}</p>
        <div className="mt-4 flex gap-2">
          <Button asChild size="sm" variant="secondary">
            <a href={phoneHref(client.phone)}>Call</a>
          </Button>
          <Button asChild size="sm">
            <a href={whatsAppHref(client.phone)} target="_blank" rel="noreferrer">WhatsApp</a>
          </Button>
        </div>
      </LuxuryCard>
      <div className="mt-4">
        <ClientEditForm client={client} role={profile.role} />
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

function whatsAppHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

function phoneHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}
