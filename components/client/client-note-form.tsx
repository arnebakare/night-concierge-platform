import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { addClientNote } from "@/lib/actions/management-actions";
import type { Club, Role } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

const noteTypes = ["PREFERENCE", "SPENDING", "BEHAVIOR", "RELIABILITY", "GUESTLIST", "WARNING", "BLOCKED", "INTERNAL"];
const staffVisibility = ["GLOBAL", "CLUB_ONLY", "PRIVATE_TO_AUTHOR"];
const managerVisibility = ["GLOBAL", "CLUB_ONLY", "MANAGER_ONLY", "PRIVATE_TO_AUTHOR"];

export function ClientNoteForm({ clientId, role, clubs }: Readonly<{ clientId: string; role: Role; clubs: Club[] }>) {
  const visibility = role === "PROMOTER" ? staffVisibility : managerVisibility;

  return (
    <LuxuryCard>
      <form action={addClientNote} className="space-y-4">
        <input type="hidden" name="clientId" value={clientId} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Visibility">
            <select name="visibility" className="h-12 w-full rounded-md border bg-input px-3 text-sm text-foreground">
              {visibility.map((item) => (
                <option key={item} value={item}>
                  {formatEnum(item)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select name="noteType" className="h-12 w-full rounded-md border bg-input px-3 text-sm text-foreground">
              {noteTypes.map((item) => (
                <option key={item} value={item}>
                  {formatEnum(item)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Club for club-only notes">
          <select name="clubId" className="h-12 w-full rounded-md border bg-input px-3 text-sm text-foreground"><option value="">No specific club</option>{clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select>
        </Field>
        <Field label="New note">
          <Textarea name="content" required minLength={3} maxLength={1200} placeholder="Preference, spend history, reliability, warning, or internal context..." />
        </Field>
        <Button type="submit" className="w-full" size="lg">
          Add note
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
