import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { signOut, updateOwnProfile } from "@/lib/actions/account-actions";
import { formatEnum } from "@/lib/utils";

export default async function ProfilePage() {
  const profile = await requireProfile();
  return (
    <AppShell profile={profile} title="My profile" eyebrow={formatEnum(profile.role)}>
      <LuxuryCard>
        <form action={updateOwnProfile} className="space-y-4">
          <div className="space-y-2"><Label>Name</Label><Input name="name" defaultValue={profile.name ?? ""} required /></div>
          <div className="space-y-2"><Label>Email</Label><Input value={profile.email ?? ""} readOnly /></div>
          <div className="space-y-2"><Label>Phone</Label><Input name="phone" type="tel" defaultValue={profile.phone ?? ""} placeholder="+34..." /></div>
          <Button type="submit" className="w-full">Save profile</Button>
        </form>
      </LuxuryCard>
      <form action={signOut} className="mt-4"><Button type="submit" variant="outline" className="w-full">Sign out</Button></form>
    </AppShell>
  );
}
