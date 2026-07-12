import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { createPromoterLink } from "@/lib/actions/management-actions";
import type { Club, Profile } from "@/lib/types";

export function PromoterLinkForm({ clubs, promoters }: Readonly<{ clubs: Club[]; promoters: Profile[] }>) {
  return <LuxuryCard><form action={createPromoterLink} className="space-y-4"><div className="flex items-center gap-2"><Link2 className="size-5 text-champagne-300" /><h2 className="font-serif text-2xl">Permanent link</h2></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><div className="space-y-2"><Label>Promoter</Label><select name="promoterId" className="h-12 w-full rounded-md border bg-input px-3 text-sm" required>{promoters.map((promoter) => <option key={promoter.id} value={promoter.id}>{promoter.name ?? promoter.email}</option>)}</select></div><div className="space-y-2"><Label>Title</Label><Input name="title" placeholder="Julia VIP requests" required /></div><div className="space-y-2"><Label>Link name</Label><Input name="slug" placeholder="julia-vip" pattern="[a-z0-9-]+" required /></div><div className="space-y-2"><Label>Club</Label><select name="clubId" className="h-12 w-full rounded-md border bg-input px-3 text-sm"><option value="">Any club</option>{clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select></div></div><Button type="submit" disabled={!promoters.length}>Create permanent link</Button></form></LuxuryCard>;
}
