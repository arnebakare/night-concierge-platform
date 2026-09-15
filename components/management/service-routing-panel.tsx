import { Route } from "lucide-react";
import { saveServicePathDefault, saveServiceRoutingRule } from "@/lib/actions/management-actions";
import type { Profile, RequestType, ServicePathDefault, ServiceRoutingRule } from "@/lib/types";

const serviceTypes: RequestType[] = ["TABLE", "GUESTLIST", "VIP_SERVICE", "BOAT", "GOLF", "VILLA", "TRANSFER", "SCHEDULE", "PACKAGE", "GENERAL"];

const serviceMeta: Record<RequestType, { intent: string; path: string; placeholder: string }> = {
  TABLE: { intent: "Nightclub table", path: "Nightlife", placeholder: "Example: Julia first for tables, Daniel as backup" },
  GUESTLIST: { intent: "Guestlist", path: "Nightlife", placeholder: "Example: route guestlists to the active promoter" },
  VIP_SERVICE: { intent: "Beach club / VIP service", path: "Nightlife", placeholder: "Example: Mamzel and beach requests go to Julia" },
  BOAT: { intent: "Boat or yacht", path: "Concierge", placeholder: "Example: yachts go to the boat specialist" },
  GOLF: { intent: "Golf", path: "Concierge", placeholder: "Example: Daniel handles golf first" },
  VILLA: { intent: "Hotel or villa", path: "Concierge", placeholder: "Example: villas stay with manager until qualified" },
  TRANSFER: { intent: "Transfers", path: "Concierge", placeholder: "Example: drivers go to operations first" },
  SCHEDULE: { intent: "Full stay planning", path: "Concierge", placeholder: "Example: manager owns full schedules" },
  PACKAGE: { intent: "Curated package", path: "Concierge", placeholder: "Example: package requests go to manager, then assigned" },
  GENERAL: { intent: "Other request", path: "General", placeholder: "Example: manager reviews unclear requests" }
};

export function ServiceRoutingPanel({
  rules,
  serviceDefaults = [],
  promoters,
  managers,
  stats = {}
}: Readonly<{
  rules: ServiceRoutingRule[];
  serviceDefaults?: ServicePathDefault[];
  promoters: Profile[];
  managers: Profile[];
  stats?: Partial<Record<RequestType, { open: number; recent: number }>>;
}>) {
  const rulesByType = new Map(rules.map((rule) => [rule.request_type, rule]));
  const defaultsByType = new Map(serviceDefaults.map((item) => [item.request_type, item]));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Route className="size-4 text-amber-600" /> Service routing</p>
        <p className="mt-1 text-xs text-slate-500">Set the normal owner for each customer need. Empty means the manager can pick it up manually.</p>
      </div>
      <div className="divide-y divide-slate-200">
        {serviceTypes.map((type) => {
          const rule = rulesByType.get(type);
          const serviceDefault = defaultsByType.get(type);
          const typeStats = stats[type];
          const meta = serviceMeta[type];
          return (
            <div key={type} className="px-4 py-3">
              <form action={saveServiceRoutingRule} className="grid gap-3 md:grid-cols-[11rem_1fr_1fr_1fr_5.5rem] md:items-end">
                <input type="hidden" name="requestType" value={type} />
                <div>
                  <p className="text-sm font-semibold">{meta.intent}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {meta.path} · {rule?.active === false ? "Paused" : "Active routing"}
                    {typeStats ? ` · ${typeStats.open} open · ${typeStats.recent} recent` : ""}
                  </p>
                </div>
                <SelectField name="defaultPromoterId" label="Default promoter" value={rule?.default_promoter_id ?? ""} options={promoters} emptyLabel="No default" />
                <SelectField name="fallbackPromoterId" label="Fallback" value={rule?.fallback_promoter_id ?? ""} options={promoters} emptyLabel="No fallback" />
                <div className="grid gap-2 sm:grid-cols-[1fr_8rem] md:grid-cols-1">
                  <SelectField name="managerId" label="Manager" value={rule?.manager_id ?? ""} options={managers} emptyLabel="Default manager" />
                  <label className="flex min-h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-600">
                    <input type="checkbox" name="active" value="true" defaultChecked={rule?.active ?? true} className="size-4 accent-amber-600" />
                    Active
                  </label>
                </div>
                <div className="grid gap-2 md:col-span-5 md:grid-cols-[1fr_5.5rem]">
                  <label className="grid gap-1">
                    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Notes</span>
                    <input
                      name="notes"
                      defaultValue={rule?.notes ?? ""}
                      placeholder={meta.placeholder}
                      className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-amber-500"
                    />
                  </label>
                  <button type="submit" className="h-9 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                    Save
                  </button>
                </div>
              </form>
              <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50">
                <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Customer defaults
                </summary>
                <ServiceDefaultsForm type={type} meta={meta} serviceDefault={serviceDefault} />
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ServiceDefaultsForm({
  type,
  meta,
  serviceDefault
}: Readonly<{ type: RequestType; meta: (typeof serviceMeta)[RequestType]; serviceDefault?: ServicePathDefault }>) {
  return (
    <form action={saveServicePathDefault} className="grid gap-2 border-t border-slate-200 p-3 md:grid-cols-2">
      <input type="hidden" name="requestType" value={type} />
      <label className="grid gap-1">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Customer title</span>
        <input name="customerTitle" defaultValue={serviceDefault?.customer_title ?? meta.intent} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-amber-500" />
      </label>
      <label className="flex min-h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 md:self-end">
        <input type="checkbox" name="active" value="true" defaultChecked={serviceDefault?.active ?? true} className="size-4 accent-amber-600" />
        Show these defaults on customer forms
      </label>
      <label className="grid gap-1 md:col-span-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Customer intro</span>
        <input name="customerIntro" defaultValue={serviceDefault?.customer_intro ?? ""} placeholder="Short customer-facing explanation" className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-amber-500" />
      </label>
      <label className="grid gap-1 md:col-span-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Detail prompt</span>
        <input name="detailPrompt" defaultValue={serviceDefault?.detail_prompt ?? ""} placeholder="What should the client add later in the form?" className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-amber-500" />
      </label>
      <label className="grid gap-1 md:col-span-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Helpful questions, one per line</span>
        <textarea name="questionPrompts" defaultValue={serviceDefault?.question_prompts.join("\n") ?? ""} placeholder={"Preferred timing?\nAny must-have venue?\nHigh spend or normal?"} className="min-h-20 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-500" />
      </label>
      <div className="grid gap-2 md:col-span-2 md:grid-cols-7">
        {addonFields.map((field) => (
          <label key={field.name} className="grid gap-1">
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{field.label}</span>
            <input name={field.name} type="number" min={0} max={14} defaultValue={serviceDefault?.default_addons[field.name] ?? 0} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-amber-500" />
          </label>
        ))}
      </div>
      <button type="submit" className="h-9 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 md:col-span-2">
        Save customer defaults
      </button>
    </form>
  );
}

const addonFields = [
  { name: "addonBeachClub", label: "Beach" },
  { name: "addonDinner", label: "Dinner" },
  { name: "addonNightclub", label: "Club" },
  { name: "addonGolf", label: "Golf" },
  { name: "addonYacht", label: "Yacht" },
  { name: "addonTransfer", label: "Driver" },
  { name: "addonVilla", label: "Stay" }
] as const;

function SelectField({
  name,
  label,
  value,
  options,
  emptyLabel
}: Readonly<{ name: string; label: string; value: string; options: Profile[]; emptyLabel: string }>) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <select name={name} defaultValue={value} className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm outline-none transition focus:border-amber-500">
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name ?? option.email ?? "Unnamed"}
          </option>
        ))}
      </select>
    </label>
  );
}
