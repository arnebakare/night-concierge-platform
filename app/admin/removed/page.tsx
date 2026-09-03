import Link from "next/link";
import { ArchiveRestore, UserRound, ClipboardList } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { StatusSubmitButton } from "@/components/request/status-submit-button";
import { requireProfile } from "@/lib/auth";
import { getRemovedCrmRecordsForAdmin } from "@/lib/data/app";
import { restoreCrmRecord } from "@/lib/actions/management-actions";
import { formatEnum } from "@/lib/utils";

export default async function AdminRemovedPage() {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const { clients, requests } = await getRemovedCrmRecordsForAdmin();

  return (
    <AppShell profile={profile} title="Removed records" eyebrow="Admin CRM">
      <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white text-center text-slate-950">
        <Metric label="Customers" value={clients.length} />
        <Metric label="Requests" value={requests.length} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950">
          <Header icon={UserRound} title="Removed customers" />
          <div className="divide-y divide-slate-200">
            {clients.length ? clients.map((client) => (
              <div key={client.id} className="p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <Link href={`/manager/clients/${client.id}`} className="truncate text-sm font-semibold hover:underline">{client.name}</Link>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{client.phone} · {client.client_code ? `SKU ${client.client_code}` : "No SKU"}</p>
                    <p className="mt-1 text-xs text-slate-500">{removedLabel(client.removed_at)}{client.removal_reason ? ` · ${client.removal_reason}` : ""}</p>
                  </div>
                  <RestoreButton recordType="client" recordId={client.id} />
                </div>
              </div>
            )) : <Empty label="No removed customers." />}
          </div>
        </section>
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950">
          <Header icon={ClipboardList} title="Removed requests" />
          <div className="divide-y divide-slate-200">
            {requests.length ? requests.map((request) => (
              <div key={request.id} className="p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <Link href={`/manager/requests/${request.id}`} className="truncate text-sm font-semibold hover:underline">{request.clients?.name ?? "Guest"} · {request.clubs?.name ?? "Venue"}</Link>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{formatEnum(request.request_type)} · {request.requested_date} · {formatEnum(request.status)}</p>
                    <p className="mt-1 text-xs text-slate-500">{removedLabel(request.removed_at)}{request.removal_reason ? ` · ${request.removal_reason}` : ""}</p>
                  </div>
                  <RestoreButton recordType="request" recordId={request.id} />
                </div>
              </div>
            )) : <Empty label="No removed requests." />}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function RestoreButton({ recordType, recordId }: Readonly<{ recordType: "client" | "request"; recordId: string }>) {
  return (
    <form action={restoreCrmRecord}>
      <input type="hidden" name="recordType" value={recordType} />
      <input type="hidden" name="recordId" value={recordId} />
      <StatusSubmitButton label="Restore" pendingLabel="Restoring" size="sm" variant="secondary" className="bg-slate-100 text-slate-900 hover:bg-slate-200" />
    </form>
  );
}

function Header({ icon: Icon, title }: Readonly<{ icon: typeof UserRound; title: string }>) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
      <Icon className="size-4 text-amber-700" />
      <h2 className="text-sm font-semibold">{title}</h2>
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="border-r border-slate-200 p-2.5 last:border-r-0">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold leading-none">{value}</p>
    </div>
  );
}

function Empty({ label }: Readonly<{ label: string }>) {
  return <div className="p-5 text-center text-sm text-slate-500">{label}</div>;
}

function removedLabel(value?: string | null) {
  return value ? `Removed ${new Date(value).toLocaleString()}` : "Removed";
}
