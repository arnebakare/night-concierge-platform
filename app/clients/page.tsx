import { AppShell } from "@/components/layout/app-shell";
import { ClientCard } from "@/components/client/client-card";
import { ClientCreateForm } from "@/components/client/client-create-form";
import { ClientSearchForm } from "@/components/client/client-search-form";
import { requireProfile } from "@/lib/auth";
import { getClientsForProfile } from "@/lib/data/app";

export default async function ClientsPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ q?: string }> }>) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const filters = await searchParams;
  const clients = await getClientsForProfile(profile, { q: filters.q });

  return (
    <AppShell profile={profile} title="Clients" eyebrow="CRM">
      <div className="space-y-4">
        <ClientSearchForm action="/clients" value={filters.q} />
        <ClientCreateForm role={profile.role} />
        <div className="space-y-3">
          {clients.length ? clients.map((client) => <ClientCard key={client.id} client={client} href={`/clients/${client.id}`} />) : <EmptyState />}
        </div>
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-champagne-700/40 bg-card/80 p-6 text-center text-sm text-muted-foreground">
      No clients match this search.
    </div>
  );
}
