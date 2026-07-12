import { ChevronDown, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { createClientRecord } from "@/lib/actions/management-actions";
import type { Role } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

const vipLevels = ["STANDARD", "SILVER", "GOLD", "PLATINUM"];
const clientStatuses = ["NORMAL", "WATCHLIST", "MANAGER_APPROVAL_REQUIRED", "BLOCKED"];

export function ClientCreateForm({ role }: Readonly<{ role: Role }>) {
  const canSetRiskStatus = role === "PROMOTER_MANAGER" || role === "SUPER_ADMIN";

  return (
    <details className="group rounded-lg border border-champagne-700/40 bg-card/80 p-3 shadow-panel">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-semibold">
          <span className="flex size-9 items-center justify-center rounded-md bg-champagne-500/10 text-champagne-300"><UserPlus className="size-5" /></span>
          Add client
        </span>
        <ChevronDown className="size-5 text-champagne-300 transition group-open:rotate-180" />
      </summary>
      <LuxuryCard className="mt-3 border-champagne-700/20 bg-background/35 shadow-none">
        <form action={createClientRecord} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Name">
            <Input name="name" placeholder="Daniel" required />
          </Field>
          <Field label="Phone / WhatsApp">
            <Input name="phone" placeholder="+34..." required />
          </Field>
          <Field label="Email optional">
            <Input name="email" type="email" placeholder="name@email.com" />
          </Field>
          <Field label="Instagram optional">
            <Input name="instagram" placeholder="@handle" />
          </Field>
          <Field label="VIP level">
            <select name="vipLevel" defaultValue="STANDARD" className="h-12 w-full rounded-md border bg-input px-3 text-sm text-foreground">
              {vipLevels.map((level) => <option key={level} value={level}>{formatEnum(level)}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select
              name="status"
              defaultValue="NORMAL"
              disabled={!canSetRiskStatus}
              className="h-12 w-full rounded-md border bg-input px-3 text-sm text-foreground disabled:opacity-60"
            >
              {clientStatuses.map((status) => <option key={status} value={status}>{formatEnum(status)}</option>)}
            </select>
          </Field>
        </div>
        <Button type="submit" className="w-full md:w-auto" size="lg">
          Create client
        </Button>
      </form>
      </LuxuryCard>
    </details>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
