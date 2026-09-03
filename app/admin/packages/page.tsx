import { PackagePlus } from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { StatusSubmitButton } from "@/components/request/status-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { Textarea } from "@/components/ui/textarea";
import { saveConciergePackage, setConciergePackageActive } from "@/lib/actions/management-actions";
import { requireProfile } from "@/lib/auth";
import { getClientsForProfile, getConciergePackagesForProfile } from "@/lib/data/app";
import type { ConciergePackage, RequestType } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

const packageTypes: RequestType[] = ["PACKAGE", "SCHEDULE", "BOAT", "GOLF", "VILLA", "TRANSFER", "VIP_SERVICE", "GENERAL"];

export default async function AdminPackagesPage() {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const [packages, clients] = await Promise.all([
    getConciergePackagesForProfile(profile),
    getClientsForProfile(profile)
  ]);

  return (
    <AppShell profile={profile} title="Packages" eyebrow="Concierge CMS">
      <div className="mb-3 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white text-center text-slate-950">
        <Metric label="Packages" value={packages.length} />
        <Metric label="Active" value={packages.filter((item) => item.active).length} />
        <Metric label="Tailored" value={packages.filter((item) => item.tailored_client_id).length} />
      </div>

      <LuxuryCard className="mb-4 bg-white text-slate-950">
        <details>
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
            Create package
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
              <PackagePlus className="size-3.5" /> Ready-made or tailored
            </span>
          </summary>
          <PackageForm clients={clients} />
        </details>
      </LuxuryCard>

      <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {packages.map((item) => <PackageRow key={item.id} item={item} clients={clients} />)}
        {!packages.length && <div className="p-6 text-center text-sm text-slate-500">No packages yet.</div>}
      </div>
    </AppShell>
  );
}

function PackageRow({ item, clients }: Readonly<{ item: ConciergePackage; clients: Awaited<ReturnType<typeof getClientsForProfile>> }>) {
  return (
    <div className={`px-3 py-2.5 text-slate-950 ${!item.active ? "opacity-65" : ""}`}>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="min-w-0">
          <p className="truncate font-semibold">{item.title}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {formatEnum(item.request_type)} · /{item.slug}{item.clients ? ` · for ${item.clients.name}` : " · available to all clients"}
          </p>
        </div>
        <span className={item.active ? "w-fit rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700" : "w-fit rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"}>
          {item.active ? "Active" : "Archived"}
        </span>
      </div>
      {item.description && <p className="mt-2 text-sm text-slate-600">{item.description}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.price_hint && <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">{item.price_hint}</span>}
        {item.package_items.slice(0, 4).map((detail) => <span key={detail} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{detail}</span>)}
      </div>
      <details className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">Edit package</summary>
        <PackageForm item={item} clients={clients} />
      </details>
      <form action={setConciergePackageActive} className="mt-2">
        <input type="hidden" name="packageId" value={item.id} />
        <input type="hidden" name="active" value={String(!item.active)} />
        <StatusSubmitButton label={item.active ? "Archive package" : "Reactivate package"} pendingLabel="Saving" variant="outline" className="w-full" />
      </form>
    </div>
  );
}

function PackageForm({ item, clients }: Readonly<{ item?: ConciergePackage; clients: Awaited<ReturnType<typeof getClientsForProfile>> }>) {
  return (
    <form action={saveConciergePackage} className="mt-3 grid gap-2 md:grid-cols-2">
      <input type="hidden" name="packageId" value={item?.id ?? ""} />
      <Field label="Title">
        <Input name="title" defaultValue={item?.title ?? ""} placeholder="High-spend party trail" required className="bg-white text-slate-950" />
      </Field>
      <Field label="Slug">
        <Input name="slug" defaultValue={item?.slug ?? ""} placeholder="high-spend-party-trail" required className="bg-white text-slate-950" />
      </Field>
      <Field label="Service type">
        <select name="requestType" defaultValue={item?.request_type ?? "PACKAGE"} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950">
          {packageTypes.map((type) => <option key={type} value={type}>{formatEnum(type)}</option>)}
        </select>
      </Field>
      <Field label="Tailored for">
        <select name="tailoredClientId" defaultValue={item?.tailored_client_id ?? ""} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950">
          <option value="">All clients</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.phone}</option>)}
        </select>
      </Field>
      <Field label="Price hint">
        <Input name="priceHint" defaultValue={item?.price_hint ?? ""} placeholder="Quoted by dates and group size" className="bg-white text-slate-950" />
      </Field>
      <Field label="Description">
        <Input name="description" defaultValue={item?.description ?? ""} placeholder="Short internal/client-facing summary" className="bg-white text-slate-950" />
      </Field>
      <Field label="Included items">
        <Textarea name="packageItems" defaultValue={item?.package_items.join("\n") ?? ""} placeholder={"Beach club day\nDinner reservation\nNightclub table\nTransfers"} className="min-h-28 bg-white text-slate-950 md:col-span-2" />
      </Field>
      <StatusSubmitButton label={item ? "Save package" : "Create package"} pendingLabel="Saving" className="md:col-span-2" />
    </form>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return <div className="space-y-1.5 md:contents"><Label className="text-slate-700 md:col-span-2">{label}</Label>{children}</div>;
}

function Metric({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="border-r border-slate-200 p-2.5 last:border-r-0">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold leading-none">{value}</p>
    </div>
  );
}
