"use client";

import { Copy, QrCode, ShieldOff, Link2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { setPromoterLinkActive } from "@/lib/actions/management-actions";

const linkOptions = [
  ["nightlife", "Nightlife"],
  ["boat", "Boats"],
  ["golf", "Golf"],
  ["villa", "Villas"],
  ["transfer", "Transfers"],
  ["schedule", "Schedule"],
  ["package", "Packages"]
] as const;

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
        <summary className="cursor-pointer list-none text-sm font-semibold text-ink-950">
          Direct service links
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {linkOptions.map(([option, label]) => {
            const optionUrl = withOption(url, option);
            return (
              <Button key={option} type="button" variant="outline" size="sm" className="justify-start bg-white" onClick={() => navigator.clipboard.writeText(optionUrl)}>
                <Copy className="size-3.5" /> {label}
              </Button>
            );
          })}
        </div>
      </details>
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

function withOption(url: string, option: string) {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("option", option);
  return nextUrl.toString();
}
