import Link from "next/link";
import { ExternalLink, MonitorSmartphone, Route } from "lucide-react";
import { saveServicePathDefault, saveServiceRoutingRule } from "@/lib/actions/management-actions";
import type { Profile, RequestType, ServicePathDefault, ServiceRoutingRule } from "@/lib/types";

const serviceTypes: RequestType[] = ["TABLE", "GUESTLIST", "VIP_SERVICE", "BOAT", "GOLF", "VILLA", "TRANSFER", "SCHEDULE", "PACKAGE", "GENERAL"];

const serviceMeta: Record<RequestType, { intent: string; path: string; placeholder: string; defaultQuestions: string[] }> = {
  TABLE: { intent: "Nightclub table", path: "Nightlife", placeholder: "Example: Julia first for tables, Daniel as backup", defaultQuestions: ["Preferred table area?", "Any minimum spend limit?", "Birthday or celebration?"] },
  GUESTLIST: { intent: "Guestlist", path: "Nightlife", placeholder: "Example: route guestlists to the active promoter", defaultQuestions: ["Final guest names?", "Arrival time?", "Mixed group?"] },
  VIP_SERVICE: { intent: "Beach club / VIP service", path: "Nightlife", placeholder: "Example: Mamzel and beach requests go to Julia", defaultQuestions: ["Sunbeds or table?", "Preferred arrival time?", "Lunch or drinks only?"] },
  BOAT: { intent: "Boat or yacht", path: "Concierge", placeholder: "Example: yachts go to the boat specialist", defaultQuestions: ["Boat size or group size?", "Preferred route or marina?", "Skipper, lunch, or drinks onboard?"] },
  GOLF: { intent: "Golf", path: "Concierge", placeholder: "Example: Daniel handles golf first", defaultQuestions: ["Preferred tee time?", "Handicap or playing level?", "Need clubs, buggies, or transfers?"] },
  VILLA: { intent: "Hotel or villa", path: "Concierge", placeholder: "Example: villas stay with manager until qualified", defaultQuestions: ["Bedrooms needed?", "Preferred area?", "Hotel suite or private villa?"] },
  TRANSFER: { intent: "Transfers", path: "Concierge", placeholder: "Example: drivers go to operations first", defaultQuestions: ["Pickup and drop-off?", "Flight number if airport?", "Vehicle size or chauffeur by hour?"] },
  SCHEDULE: { intent: "Full stay planning", path: "Concierge", placeholder: "Example: manager owns full schedules", defaultQuestions: ["Party focused or balanced?", "Normal or high spend?", "Any must-have venues, DJs, golf, yacht, or villa needs?"] },
  PACKAGE: { intent: "Curated package", path: "Concierge", placeholder: "Example: package requests go to manager, then assigned", defaultQuestions: ["Which package style fits best?", "What should be added or removed?", "Dates and group style?"] },
  GENERAL: { intent: "Other request", path: "General", placeholder: "Example: manager reviews unclear requests", defaultQuestions: ["What should we arrange?", "Preferred date or timing?", "Any budget or style notes?"] }
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
                  <Link href={previewHref(type)} target="_blank" className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900">
                    Preview path <ExternalLink className="size-3" />
                  </Link>
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
                <summary className="grid cursor-pointer list-none gap-2 px-3 py-2 sm:grid-cols-[1fr_auto] sm:items-center">
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Customer path controls</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {serviceDefault?.customer_title ?? meta.intent} · {(serviceDefault?.question_prompts.length ?? 0) || meta.defaultQuestions.length} prompts · {addonSummary(serviceDefault)}
                    </span>
                  </span>
                  <span className="inline-flex w-fit items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    <MonitorSmartphone className="size-3.5 text-amber-700" /> Open controls
                  </span>
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
  const previewUrl = previewHref(type);
  const questions = serviceDefault?.question_prompts.length ? serviceDefault.question_prompts : meta.defaultQuestions;
  const defaultQuestionValue = serviceDefault?.question_prompts.length ? serviceDefault.question_prompts.join("\n") : meta.defaultQuestions.join("\n");

  return (
    <div className="grid gap-3 border-t border-slate-200 p-3 lg:grid-cols-[1fr_20rem]">
      <form action={saveServicePathDefault} className="grid gap-2 md:grid-cols-2">
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
          <textarea name="questionPrompts" defaultValue={defaultQuestionValue} placeholder={"Preferred timing?\nAny must-have venue?\nHigh spend or normal?"} className="min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-500" />
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
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Admin preview</p>
          <Link href={previewUrl} target="_blank" className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900">
            Open live <ExternalLink className="size-3" />
          </Link>
        </div>
        <div className="p-3">
          <div className="rounded-lg border border-slate-200 bg-slate-950 p-3 text-white">
            <p className="text-[11px] uppercase tracking-[0.16em] text-amber-300">{meta.path}</p>
            <p className="mt-2 text-lg font-semibold">{serviceDefault?.customer_title ?? meta.intent}</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">{serviceDefault?.customer_intro || "Tell us what you need. A host will reply personally and shape the best option."}</p>
            <div className="mt-3 space-y-1.5">
              {questions.slice(0, 3).map((question) => (
                <p key={question} className="rounded-md bg-white/10 px-2 py-1.5 text-xs text-slate-200">{question}</p>
              ))}
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Fields clients will see</p>
            <div className="mt-2 grid gap-1.5">
              {serviceFields(type).map((field) => (
                <span key={field} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700">{field}</span>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">Use “Open live” for the full mobile path. The preview above updates from the saved admin defaults.</p>
          </div>
        </div>
      </div>
    </div>
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

function addonSummary(serviceDefault?: ServicePathDefault) {
  const entries = Object.entries(serviceDefault?.default_addons ?? {}).filter(([, value]) => Number(value) > 0);
  if (!entries.length) return "no default add-ons";
  return entries.map(([key, value]) => `${addonFields.find((field) => field.name === key)?.label ?? key} x${value}`).join(" · ");
}

function serviceFields(type: RequestType) {
  const common = ["Name", "WhatsApp number", "Dates", "Guests", "Spend notes"];
  const specific: Partial<Record<RequestType, string[]>> = {
    BOAT: ["Boat style", "Boat size", "Route or marina"],
    GOLF: ["Tee time", "Golf level / handicap", "Preferred course"],
    VILLA: ["Bedrooms", "Stay style", "Preferred area"],
    TRANSFER: ["Pickup", "Drop-off", "Flight number", "Vehicle preference"],
    SCHEDULE: ["Trip style", "Occasion", "Add-on builder"],
    PACKAGE: ["Package choice", "Add-on builder", "Occasion"],
    TABLE: ["Arrival time", "Table area notes", "Occasion"],
    GUESTLIST: ["Arrival time", "Guest count", "Occasion"],
    VIP_SERVICE: ["Arrival time", "Beach/table notes", "Occasion"],
    GENERAL: ["Occasion", "Preferred area", "Message"]
  };
  return [...common, ...(specific[type] ?? [])];
}

function previewHref(type: RequestType) {
  const optionByType: Partial<Record<RequestType, string>> = {
    TABLE: "table",
    GUESTLIST: "guestlist",
    VIP_SERVICE: "vip",
    BOAT: "boat",
    GOLF: "golf",
    VILLA: "villa",
    TRANSFER: "transfer",
    SCHEDULE: "schedule",
    PACKAGE: "package",
    GENERAL: "general"
  };
  return `/request?option=${optionByType[type] ?? "general"}`;
}

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
