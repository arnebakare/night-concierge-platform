"use client";

import { Copy, QrCode, ShieldOff, Link2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { setPromoterLinkActive } from "@/lib/actions/management-actions";

export function PromoterLinkCard({ id, title, subtitle, url, active = true }: Readonly<{ id: string; title: string; subtitle?: string; url: string; active?: boolean }>) {
  return (
    <LuxuryCard className={`client-row link-row bg-white text-ink-950 ${active ? "" : "opacity-70"}`}>
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-950 md:text-base">{title} <span className="ml-1 text-xs text-slate-500">{active ? "ACTIVE" : "ARCHIVED"}</span></p>
          {subtitle && <p className="text-sm text-champagne-700">{subtitle}</p>}
          <p className="truncate text-sm text-slate-500">{url}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <Button className="w-full" size="sm" onClick={() => navigator.clipboard.writeText(url)}>
            <Copy className="size-4" /> Copy
          </Button>
          <form action={setPromoterLinkActive}>
            <input type="hidden" name="promoterLinkId" value={id} />
            <input type="hidden" name="active" value={String(!active)} />
            <Button type="submit" variant="outline" size="sm" className="w-full">
              {active ? <ShieldOff className="size-4" /> : <Link2 className="size-4" />}
              {active ? "Archive" : "Restore"}
            </Button>
          </form>
        </div>
      </div>
      <details className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink-950">
          <QrCode className="size-4 text-champagne-700" /> Show QR code
        </summary>
        <div className="mt-3 rounded-lg bg-white p-3">
          <QRCodeSVG value={url} className="h-auto w-full max-w-56" />
        </div>
      </details>
    </LuxuryCard>
  );
}
