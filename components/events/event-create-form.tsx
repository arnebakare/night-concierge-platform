import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { Textarea } from "@/components/ui/textarea";
import { createEvent } from "@/lib/actions/management-actions";
import type { Club } from "@/lib/types";

export function EventCreateForm({ clubs }: Readonly<{ clubs: Club[] }>) {
  return (
    <LuxuryCard>
      <form action={createEvent} className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarPlus className="size-5 text-champagne-300" />
          <h2 className="font-serif text-2xl">Create event</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Club">
            <select name="clubId" className="h-12 w-full rounded-md border bg-input px-3 text-sm text-foreground">
              {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <Input name="eventDate" type="date" required />
          </Field>
          <Field label="Name">
            <Input name="name" placeholder="Mamzel Saturday" required />
          </Field>
          <Field label="Slug">
            <Input name="slug" placeholder="mamzel-saturday" required />
          </Field>
        </div>
        <Field label="Description">
          <Textarea name="description" placeholder="Internal event context, table focus, notes for promoters..." />
        </Field>
        <Button type="submit">Create event</Button>
      </form>
    </LuxuryCard>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
