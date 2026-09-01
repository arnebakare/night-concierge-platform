import { Percent, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { saveCommissionRule, setCommissionRuleActive } from "@/lib/actions/management-actions";
import type { Club, CommissionRule, Profile, RequestType } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

const requestTypes: RequestType[] = ["GUESTLIST", "TABLE", "VIP_SERVICE", "GENERAL"];

export function CommissionRulesManager({
  rules,
  clubs,
  promoters
}: Readonly<{ rules: CommissionRule[]; clubs: Club[]; promoters: Profile[] }>) {
  return (
    <div className="space-y-4">
      <LuxuryCard className="bg-white text-slate-950">
        <details>
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
            Add commission rule
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
              <Plus className="size-3.5" /> Promoter, venue, service
            </span>
          </summary>
          <form action={saveCommissionRule} className="mt-3 grid gap-2 md:grid-cols-5">
            <Field label="Promoter">
              <select name="promoterId" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
                <option value="">Any promoter</option>
                {promoters.map((promoter) => <option key={promoter.id} value={promoter.id}>{promoter.name ?? promoter.email}</option>)}
              </select>
            </Field>
            <Field label="Venue">
              <select name="clubId" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
                <option value="">Any venue</option>
                {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
              </select>
            </Field>
            <Field label="Service">
              <select name="requestType" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
                <option value="">Any service</option>
                {requestTypes.map((type) => <option key={type} value={type}>{formatEnum(type)}</option>)}
              </select>
            </Field>
            <Field label="Rate %">
              <Input name="ratePercent" type="number" min={0} max={100} step="0.1" defaultValue={10} className="bg-white text-slate-950" />
            </Field>
            <Field label="Flat fee">
              <Input name="flatFee" type="number" min={0} step="1" defaultValue={0} className="bg-white text-slate-950" />
            </Field>
            <Button type="submit" className="bg-slate-950 text-white hover:bg-slate-800 md:col-span-5">
              <Percent className="size-4" /> Save rule
            </Button>
          </form>
        </details>
      </LuxuryCard>

      <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {rules.map((rule) => (
          <div key={rule.id} className={`p-3 text-sm text-slate-950 ${!rule.active ? "opacity-60" : ""}`}>
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_0.8fr_0.8fr_auto] md:items-center">
              <RuleCell label="Promoter" value={rule.profiles?.name ?? rule.profiles?.email ?? "Any promoter"} />
              <RuleCell label="Venue" value={rule.clubs?.name ?? "Any venue"} />
              <RuleCell label="Service" value={rule.request_type ? formatEnum(rule.request_type) : "Any service"} />
              <RuleCell label="Commission" value={`${Number(rule.rate_percent).toFixed(1)}% + ${formatMoney(rule.flat_fee_cents, "eur")}`} />
              <form action={setCommissionRuleActive} className="md:justify-self-end">
                <input type="hidden" name="ruleId" value={rule.id} />
                <input type="hidden" name="active" value={String(!rule.active)} />
                <Button type="submit" size="sm" variant="secondary" className="bg-slate-100 text-slate-900 hover:bg-slate-200">
                  {rule.active ? "Archive" : "Restore"}
                </Button>
              </form>
            </div>
            <details className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
              <summary className="cursor-pointer text-xs font-semibold text-slate-600">Edit rule</summary>
              <form action={saveCommissionRule} className="mt-3 grid gap-2 md:grid-cols-5">
                <input type="hidden" name="ruleId" value={rule.id} />
                <Field label="Promoter">
                  <select name="promoterId" defaultValue={rule.promoter_id ?? ""} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
                    <option value="">Any promoter</option>
                    {promoters.map((promoter) => <option key={promoter.id} value={promoter.id}>{promoter.name ?? promoter.email}</option>)}
                  </select>
                </Field>
                <Field label="Venue">
                  <select name="clubId" defaultValue={rule.club_id ?? ""} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
                    <option value="">Any venue</option>
                    {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
                  </select>
                </Field>
                <Field label="Service">
                  <select name="requestType" defaultValue={rule.request_type ?? ""} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
                    <option value="">Any service</option>
                    {requestTypes.map((type) => <option key={type} value={type}>{formatEnum(type)}</option>)}
                  </select>
                </Field>
                <Field label="Rate %">
                  <Input name="ratePercent" type="number" min={0} max={100} step="0.1" defaultValue={rule.rate_percent} className="bg-white text-slate-950" />
                </Field>
                <Field label="Flat fee">
                  <Input name="flatFee" type="number" min={0} step="1" defaultValue={rule.flat_fee_cents / 100} className="bg-white text-slate-950" />
                </Field>
                <Button type="submit" size="sm" className="bg-slate-950 text-white hover:bg-slate-800 md:col-span-5">Save changes</Button>
              </form>
            </details>
          </div>
        ))}
        {!rules.length && <div className="p-6 text-center text-sm text-slate-500">No commission rules yet.</div>}
      </div>
    </div>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return <div className="space-y-1.5"><Label className="text-slate-700">{label}</Label>{children}</div>;
}

function RuleCell({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-0.5 truncate font-medium text-slate-950">{value}</p>
    </div>
  );
}

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(amountCents / 100);
}
