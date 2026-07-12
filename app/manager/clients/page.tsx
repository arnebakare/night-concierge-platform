import { AppShell } from "@/components/layout/app-shell";
import { ClientCard } from "@/components/client/client-card";
import { ClientCreateForm } from "@/components/client/client-create-form";
import { ClientSearchForm } from "@/components/client/client-search-form";
import { requireProfile } from "@/lib/auth";
import { getClientsForProfile } from "@/lib/data/app";

export default async function ManagerClientsPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ q?: string }> }>) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const filters = await searchParams;
  const clients = await getClientsForProfile(profile, { q: filters.q });

  return (
    <AppShell profile={profile} title="Client CRM" eyebrow="Manager">
      <div className="space-y-4">
        <ClientSearchForm action="/manager/clients" value={filters.q} placeholder="Search by phone, name, Instagram, VIP level" />
        <ClientCreateForm role={profile.role} />
        <div className="grid gap-3 md:grid-cols-2">
          {clients.length ? clients.map((client) => <ClientCard key={client.id} client={client} href={`/manager/clients/${client.id}`} />) : <EmptyState />}
        </div>
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-champagne-700/40 bg-card/80 p-6 text-center text-sm text-muted-foreground md:col-span-2">
      No clients match this search.
    </div>
  );
}
