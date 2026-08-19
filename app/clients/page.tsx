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
        <div className="compact-list grid gap-2">
          {clients.length ? clients.map((client) => <ClientCard key={client.id} client={client} href={`/clients/${client.id}`} />) : <EmptyState />}
        </div>
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
      <p className="font-medium text-ink-950">No clients found</p>
      <p className="mt-1">Try another search or add the client from the button above.</p>
    </div>
  );
}
