import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { updateClientRecord } from "@/lib/actions/management-actions";
import type { Client, Role } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

const vipLevels = ["STANDARD", "SILVER", "GOLD", "PLATINUM"];
const clientStatuses = ["NORMAL", "WATCHLIST", "MANAGER_APPROVAL_REQUIRED", "BLOCKED"];

export function ClientEditForm({ client, role }: Readonly<{ client: Client; role: Role }>) {
  const canSetRiskStatus = role === "PROMOTER_MANAGER" || role === "SUPER_ADMIN";

  return (
    <LuxuryCard>
      <form action={updateClientRecord} className="space-y-4">
        <input type="hidden" name="clientId" value={client.id} />
        <div className="flex items-center gap-2">
          <Save className="size-5 text-champagne-300" />
          <h2 className="font-serif text-2xl">Client details</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Name">
            <Input name="name" defaultValue={client.name} required />
          </Field>
          <Field label="Phone / WhatsApp">
            <Input name="phone" defaultValue={client.phone} required />
          </Field>
          <Field label="Email optional">
            <Input name="email" type="email" defaultValue={client.email ?? ""} />
          </Field>
          <Field label="Instagram optional">
            <Input name="instagram" defaultValue={client.instagram ?? ""} />
          </Field>
          <Field label="VIP level">
            <select name="vipLevel" defaultValue={client.vip_level} className="h-12 w-full rounded-md border bg-input px-3 text-sm text-foreground">
              {vipLevels.map((level) => <option key={level} value={level}>{formatEnum(level)}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select
              name="status"
              defaultValue={client.status}
              disabled={!canSetRiskStatus}
              className="h-12 w-full rounded-md border bg-input px-3 text-sm text-foreground disabled:opacity-60"
            >
              {clientStatuses.map((status) => <option key={status} value={status}>{formatEnum(status)}</option>)}
            </select>
          </Field>
        </div>
        <Button type="submit" className="w-full md:w-auto" size="lg">
          Save client
        </Button>
      </form>
    </LuxuryCard>
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
