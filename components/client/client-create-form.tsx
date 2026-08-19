import { ChevronDown, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientRecord } from "@/lib/actions/management-actions";
import type { Role } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

const vipLevels = ["STANDARD", "SILVER", "GOLD", "PLATINUM"];
const clientStatuses = ["NORMAL", "WATCHLIST", "MANAGER_APPROVAL_REQUIRED", "BLOCKED"];
const languages = [
  ["en", "English"],
  ["es", "Spanish"],
  ["sv", "Swedish"]
] as const;

export function ClientCreateForm({ role }: Readonly<{ role: Role }>) {
  const canSetRiskStatus = role === "PROMOTER_MANAGER" || role === "SUPER_ADMIN";

  return (
    <details className="client-create-panel group rounded-lg border border-champagne-700/40 bg-card/80 p-2 shadow-panel">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-champagne-500/10 text-champagne-300"><UserPlus className="size-4" /></span>
          Add client
        </span>
        <ChevronDown className="size-4 text-champagne-300 transition group-open:rotate-180" />
      </summary>
      <div className="mt-2 rounded-md border border-champagne-700/20 bg-background/35 p-2.5">
        <form action={createClientRecord} className="space-y-2.5">
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
          WhatsApp number is the customer code. Existing numbers update the same portfolio.
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          <Field label="Name">
            <Input name="name" placeholder="Daniel" required />
          </Field>
          <Field label="WhatsApp number">
            <Input name="phone" placeholder="+34..." required />
          </Field>
          <Field label="Email optional">
            <Input name="email" type="email" placeholder="name@email.com" />
          </Field>
          <Field label="Instagram optional">
            <Input name="instagram" placeholder="@handle" />
          </Field>
          <Field label="Country optional">
            <Input name="country" placeholder="Sweden, Spain, UK..." />
          </Field>
          <Field label="Message language">
            <select name="preferredLanguage" defaultValue="en" className="h-10 w-full rounded-md border bg-input px-3 text-sm text-foreground">
              {languages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="VIP level">
            <select name="vipLevel" defaultValue="STANDARD" className="h-10 w-full rounded-md border bg-input px-3 text-sm text-foreground">
              {vipLevels.map((level) => <option key={level} value={level}>{formatEnum(level)}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select
              name="status"
              defaultValue="NORMAL"
              disabled={!canSetRiskStatus}
              className="h-10 w-full rounded-md border bg-input px-3 text-sm text-foreground disabled:opacity-60"
            >
              {clientStatuses.map((status) => <option key={status} value={status}>{formatEnum(status)}</option>)}
            </select>
          </Field>
        </div>
        <Button type="submit" className="w-full md:w-auto">
          Create client
        </Button>
      </form>
      </div>
    </details>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
