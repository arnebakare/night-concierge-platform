import { CalendarPlus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createEvent } from "@/lib/actions/management-actions";
import type { Club } from "@/lib/types";

export function EventCreateForm({ clubs }: Readonly<{ clubs: Club[] }>) {
  return (
    <details className="group rounded-lg border border-champagne-700/40 bg-card/80 p-3 shadow-panel">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-semibold">
          <span className="flex size-9 items-center justify-center rounded-md bg-champagne-500/10 text-champagne-300">
            <CalendarPlus className="size-5" />
          </span>
          Create event
        </span>
        <ChevronDown className="size-5 text-champagne-300 transition group-open:rotate-180" />
      </summary>
      <form action={createEvent} className="mt-3 space-y-3 rounded-md border border-champagne-700/20 bg-background/35 p-3">
        <div className="grid gap-2 md:grid-cols-2">
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
    </details>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
