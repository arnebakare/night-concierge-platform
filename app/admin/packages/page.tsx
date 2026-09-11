import { CalendarRange, Car, Flag, PackagePlus, Sparkles, Waves } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ClientSearchForm } from "@/components/client/client-search-form";
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

const quickStarts = [
  {
    title: "Girls Weekend",
    slug: "girls-weekend",
    requestType: "PACKAGE",
    description: "A polished Marbella weekend with beach club, dinner, nightlife, and easy movement between venues.",
    priceHint: "Tailored by dates, group size, and spend",
    icon: Sparkles,
    items: ["Beach club day", "Dinner reservation", "Nightclub table or guestlist", "Private transfers", "Birthday or celebration options"]
  },
  {
    title: "Golf + Dinner",
    slug: "golf-dinner",
    requestType: "GOLF",
    description: "Golf day with tee-time options, transport, and a dinner table afterwards.",
    priceHint: "Quoted by course, tee time, and group size",
    icon: Flag,
    items: ["Golf course options", "Tee time request", "Buggy and clubs if needed", "Return transfer", "Dinner table after golf"]
  },
  {
    title: "Beach Club Day",
    slug: "beach-club-day",
    requestType: "VIP_SERVICE",
    description: "Daytime beach club setup with beds or table, drinks preferences, and optional dinner or night follow-up.",
    priceHint: "Minimum spend confirmed before booking",
    icon: Waves,
    items: ["Beach club options", "Sunbeds or table", "Arrival time", "Drinks preferences", "Optional dinner or club afterwards"]
  },
  {
    title: "Full Marbella Weekend",
    slug: "full-marbella-weekend",
    requestType: "SCHEDULE",
    description: "Full-stay planning across beach clubs, restaurants, DJs, nightlife, transfers, and optional villa/yacht add-ons.",
    priceHint: "Built around travel dates and customer style",
    icon: CalendarRange,
    items: ["Daily itinerary", "Beach clubs", "Restaurants", "Nightlife and DJ nights", "Transfers", "Optional yacht, villa, or golf add-ons"]
  }
] satisfies Array<{ title: string; slug: string; requestType: RequestType; description: string; priceHint: string; icon: typeof PackagePlus; items: string[] }>;

export default async function AdminPackagesPage({ searchParams }: Readonly<{ searchParams?: Promise<{ q?: string; type?: string; active?: string }> }>) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const filters = await searchParams;
  const [packages, clients] = await Promise.all([
    getConciergePackagesForProfile(profile),
    getClientsForProfile(profile)
  ]);
  const visiblePackages = packages.filter((item) => {
    const query = filters?.q?.trim().toLowerCase();
    const matchesQuery = !query || `${item.title} ${item.slug} ${item.description ?? ""} ${item.price_hint ?? ""} ${item.package_items.join(" ")}`.toLowerCase().includes(query);
    const matchesType = !filters?.type || item.request_type === filters.type;
    const matchesActive = !filters?.active || String(item.active) === filters.active;
    return matchesQuery && matchesType && matchesActive;
  });

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

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-slate-950 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Quick starts</p>
            <h2 className="mt-1 text-lg font-semibold">Create common concierge packages</h2>
          </div>
          <Car className="size-5 text-amber-700" />
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {quickStarts.map((template) => <QuickStartPackage key={template.slug} template={template} />)}
        </div>
      </div>

      <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto_auto] md:items-center">
        <ClientSearchForm action="/admin/packages" value={filters?.q} placeholder="Search packages, services, inclusions" />
        <FilterLink label="All" href="/admin/packages" active={!filters?.active && !filters?.type} />
        <FilterLink label="Active" href="/admin/packages?active=true" active={filters?.active === "true"} />
        <FilterLink label="Archived" href="/admin/packages?active=false" active={filters?.active === "false"} />
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {packageTypes.map((type) => <FilterLink key={type} label={formatEnum(type)} href={`/admin/packages?type=${type}`} active={filters?.type === type} />)}
      </div>

      <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {visiblePackages.map((item) => <PackageRow key={item.id} item={item} clients={clients} />)}
        {!visiblePackages.length && <div className="p-6 text-center text-sm text-slate-500">No packages match this view.</div>}
      </div>
    </AppShell>
  );
}

function QuickStartPackage({ template }: Readonly<{ template: (typeof quickStarts)[number] }>) {
  const Icon = template.icon;
  return (
    <form action={saveConciergePackage} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="title" value={template.title} />
      <input type="hidden" name="slug" value={template.slug} />
      <input type="hidden" name="requestType" value={template.requestType} />
      <input type="hidden" name="description" value={template.description} />
      <input type="hidden" name="priceHint" value={template.priceHint} />
      <input type="hidden" name="tailoredClientId" value="" />
      <input type="hidden" name="packageItems" value={template.items.join("\n")} />
      <div className="flex items-start gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-amber-700 shadow-sm">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold">{template.title}</span>
          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-600">{template.description}</span>
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {template.items.slice(0, 3).map((item) => <span key={item} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-600">{item}</span>)}
      </div>
      <StatusSubmitButton label="Use template" pendingLabel="Creating" variant="secondary" size="sm" className="mt-3 w-full bg-white text-slate-950 hover:bg-slate-100" />
    </form>
  );
}

function PackageRow({ item, clients }: Readonly<{ item: ConciergePackage; clients: Awaited<ReturnType<typeof getClientsForProfile>> }>) {
  return (
    <div className={`px-3 py-3 text-slate-950 ${!item.active ? "opacity-65" : ""}`}>
      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{item.title}</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{formatEnum(item.request_type)}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">/{item.slug}{item.clients ? ` · tailored for ${item.clients.name}` : " · available to all clients"}</p>
        </div>
        <Link href={`/request?option=package&package=${item.slug}`} className="w-fit rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
          Test form
        </Link>
        <span className="w-fit rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
          {item.package_items.length} inclusions
        </span>
        <span className={item.active ? "w-fit rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700" : "w-fit rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"}>
          {item.active ? "Active" : "Archived"}
        </span>
      </div>
      {item.description && <p className="mt-2 text-sm text-slate-600">{item.description}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.price_hint && <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">{item.price_hint}</span>}
        {item.package_items.slice(0, 4).map((detail) => <span key={detail} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{detail}</span>)}
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
        <details className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">Edit package</summary>
          <PackageForm item={item} clients={clients} />
        </details>
        <form action={setConciergePackageActive}>
          <input type="hidden" name="packageId" value={item.id} />
          <input type="hidden" name="active" value={String(!item.active)} />
          <StatusSubmitButton label={item.active ? "Archive" : "Reactivate"} pendingLabel="Saving" variant="outline" size="sm" className="w-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 md:w-auto" />
        </form>
      </div>
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

function FilterLink({ label, href, active }: Readonly<{ label: string; href: string; active?: boolean }>) {
  return (
    <Link href={href} className={active ? "inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-slate-950 px-3 text-sm font-semibold text-white" : "inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600"}>
      {label}
    </Link>
  );
}
