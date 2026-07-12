"use client";

import { Copy, Link2, MessageCircle, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { setMagicLinkActive } from "@/lib/actions/management-actions";

type MagicLinkCardProps = {
  id: string;
  url: string;
  clubName: string;
  active: boolean;
  useCount: number;
  maxUses: number | null;
  expiresAt: string | null;
  promoterPhone?: string | null;
};

export function MagicLinkCard({ id, url, clubName, active, useCount, maxUses, expiresAt, promoterPhone }: Readonly<MagicLinkCardProps>) {
  const expired = Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now());
  const promoterWhatsApp = whatsAppHref(promoterPhone);
  return (
    <LuxuryCard className={!active || expired ? "opacity-70" : undefined}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-semibold">{clubName}</p><p className="mt-1 text-xs text-muted-foreground">{useCount}{maxUses ? ` of ${maxUses}` : ""} uses · {expiresAt ? `Expires ${new Date(expiresAt).toLocaleDateString()}` : "No expiry"}</p></div>
        <span className={active && !expired ? "text-xs font-semibold text-emerald-400" : "text-xs font-semibold text-muted-foreground"}>{expired ? "EXPIRED" : active ? "ACTIVE" : "REVOKED"}</span>
      </div>
      <p className="mt-3 break-all rounded-md bg-secondary p-3 text-xs text-muted-foreground">{url}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={() => navigator.clipboard.writeText(url)}><Copy className="size-4" /> Copy</Button>
        <form action={setMagicLinkActive}>
          <input type="hidden" name="magicLinkId" value={id} />
          <input type="hidden" name="active" value={String(!active)} />
          <Button type="submit" variant="outline" className="w-full">{active ? <ShieldOff className="size-4" /> : <Link2 className="size-4" />}{active ? "Revoke" : "Restore"}</Button>
        </form>
      </div>
      {promoterWhatsApp ? (
        <Button asChild variant="ghost" className="mt-2 w-full">
          <a href={promoterWhatsApp} target="_blank" rel="noreferrer">
            <MessageCircle className="size-4" />
            Test promoter WhatsApp
          </a>
        </Button>
      ) : (
        <p className="mt-2 rounded-md border border-champagne-700/30 bg-ink-950/50 p-2 text-xs text-muted-foreground">Add a phone number to the promoter profile to show WhatsApp on this magic link.</p>
      )}
    </LuxuryCard>
  );
}

function whatsAppHref(phone?: string | null) {
  const digits = phone?.replace(/\D/g, "") || "";
  return digits ? `https://wa.me/${digits}` : null;
}
