import Link from "next/link";
import { Crown, Phone, ShieldAlert } from "lucide-react";
import { LuxuryCard } from "@/components/ui/luxury-card";
import type { Client } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

export function ClientCard({ client, href }: Readonly<{ client: Client; href: string }>) {
  return (
    <Link href={href} className="client-card block">
      <LuxuryCard className="client-row transition hover:border-champagne-300/60">
        <div className="grid gap-2 sm:grid-cols-[minmax(180px,1.2fr)_minmax(140px,0.75fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight md:text-base">{client.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <Phone className="size-3.5 shrink-0" />{client.phone}
            </p>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldAlert className="size-3.5" />{formatEnum(client.status)}
          </p>
          <span className="w-fit rounded-full border border-champagne-700/50 px-2 py-1 text-[11px] font-semibold text-champagne-100">
            <Crown className="mr-1 inline size-3" />{client.vip_level}
          </span>
        </div>
      </LuxuryCard>
    </Link>
  );
}
