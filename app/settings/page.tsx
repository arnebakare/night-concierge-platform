import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { getPlatformSetting } from "@/lib/data/app";
import { savePlatformSetting } from "@/lib/actions/management-actions";
import Link from "next/link";

export default async function SettingsPage() {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const destination = await getPlatformSetting("whatsapp_destination_number");
  return (
    <AppShell profile={profile} title="Settings" eyebrow="Notifications">
      <LuxuryCard>
        <form action={savePlatformSetting} className="space-y-4">
          <input type="hidden" name="key" value="whatsapp_destination_number" />
          <div className="space-y-2">
            <Label>WhatsApp destination number</Label>
            <Input name="value" type="tel" inputMode="tel" pattern="(whatsapp:)?\+[1-9][0-9]{7,14}" placeholder="+34600111222" defaultValue={destination} required />
            <p className="text-xs text-muted-foreground">Use the international format including + and country code.</p>
          </div>
          <Button type="submit">Save settings</Button>
        </form>
      </LuxuryCard>
      <Button asChild variant="secondary" className="mt-4 w-full md:w-auto"><Link href="/notifications">View delivery history</Link></Button>
    </AppShell>
  );
}
