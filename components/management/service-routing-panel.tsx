import { Route } from "lucide-react";
import { saveServiceRoutingRule } from "@/lib/actions/management-actions";
import type { Profile, RequestType, ServiceRoutingRule } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

const serviceTypes: RequestType[] = ["TABLE", "GUESTLIST", "VIP_SERVICE", "BOAT", "GOLF", "VILLA", "TRANSFER", "SCHEDULE", "PACKAGE", "GENERAL"];

export function ServiceRoutingPanel({
  rules,
  promoters,
  managers,
  stats = {}
}: Readonly<{
  rules: ServiceRoutingRule[];
  promoters: Profile[];
  managers: Profile[];
  stats?: Partial<Record<RequestType, { open: number; recent: number }>>;
}>) {
  const rulesByType = new Map(rules.map((rule) => [rule.request_type, rule]));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Route className="size-4 text-amber-600" /> Service routing</p>
        <p className="mt-1 text-xs text-slate-500">Choose who normally handles each service. Empty means the team can pick it up manually.</p>
      </div>
      <div className="divide-y divide-slate-200">
        {serviceTypes.map((type) => {
          const rule = rulesByType.get(type);
          const typeStats = stats[type];
          return (
            <form key={type} action={saveServiceRoutingRule} className="grid gap-3 px-4 py-3 md:grid-cols-[11rem_1fr_1fr_1fr_5.5rem] md:items-end">
              <input type="hidden" name="requestType" value={type} />
              <div>
                <p className="text-sm font-semibold">{formatEnum(type)}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {rule?.active === false ? "Paused" : "Active routing"}
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
                    placeholder="Examples: golf goes to Daniel first, transfers to Julia..."
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-amber-500"
                  />
                </label>
                <button type="submit" className="h-9 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Save
                </button>
              </div>
            </form>
          );
        })}
      </div>
    </div>
  );
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
