"use client";

import { Copy, QrCode, ShieldOff, Link2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { setPromoterLinkActive } from "@/lib/actions/management-actions";

export function PromoterLinkCard({ id, title, subtitle, url, active = true }: Readonly<{ id: string; title: string; subtitle?: string; url: string; active?: boolean }>) {
  return (
    <LuxuryCard className={`space-y-4 ${active ? "" : "opacity-70"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{title} <span className="ml-1 text-xs text-muted-foreground">{active ? "ACTIVE" : "ARCHIVED"}</span></p>
          {subtitle && <p className="text-sm text-champagne-300">{subtitle}</p>}
          <p className="break-all text-sm text-muted-foreground">{url}</p>
        </div>
        <QrCode className="size-6 text-champagne-300" />
      </div>
      <div className="rounded-lg bg-white p-3">
        <QRCodeSVG value={url} className="h-auto w-full" />
      </div>
      <Button className="w-full" size="lg" onClick={() => navigator.clipboard.writeText(url)}>
        <Copy className="size-5" /> Copy promoter link
      </Button>
      <form action={setPromoterLinkActive}><input type="hidden" name="promoterLinkId" value={id} /><input type="hidden" name="active" value={String(!active)} /><Button type="submit" variant="outline" className="w-full">{active ? <ShieldOff className="size-4" /> : <Link2 className="size-4" />}{active ? "Archive link" : "Restore link"}</Button></form>
    </LuxuryCard>
  );
}
