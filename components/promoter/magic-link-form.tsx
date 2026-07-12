import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { createMagicLink } from "@/lib/actions/management-actions";
import type { Client, Club, Profile } from "@/lib/types";

export function MagicLinkForm({ clubs, promoters, clients }: Readonly<{ clubs: Club[]; promoters: Profile[]; clients: Client[] }>) {
  return (
    <LuxuryCard>
      <form action={createMagicLink} className="space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 className="size-5 text-champagne-300" />
          <h2 className="font-serif text-2xl">Magic link</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Promoter">
            <select name="promoterId" className="h-12 w-full rounded-md border bg-input px-3 text-sm text-foreground" required>{promoters.map((promoter) => <option key={promoter.id} value={promoter.id}>{promoter.name ?? promoter.email}</option>)}</select>
          </Field>
          <Field label="Client optional">
            <select name="clientId" className="h-12 w-full rounded-md border bg-input px-3 text-sm text-foreground"><option value="">No prefilled client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.phone}</option>)}</select>
          </Field>
          <Field label="Club optional">
            <select name="clubId" className="h-12 w-full rounded-md border bg-input px-3 text-sm text-foreground">
              <option value="">Any club</option>
              {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select>
          </Field>
          <Field label="Expires optional">
            <Input name="expiresAt" type="datetime-local" />
          </Field>
          <Field label="Max uses optional">
            <Input name="maxUses" type="number" min={1} placeholder="5" />
          </Field>
        </div>
        <Button type="submit" disabled={!promoters.length}>Create magic link</Button>
      </form>
    </LuxuryCard>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
