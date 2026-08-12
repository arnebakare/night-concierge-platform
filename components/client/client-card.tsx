import Link from "next/link";
import { Crown, Phone } from "lucide-react";
import { LuxuryCard } from "@/components/ui/luxury-card";
import type { Client } from "@/lib/types";

export function ClientCard({ client, href }: Readonly<{ client: Client; href: string }>) {
  return (
    <Link href={href} className="client-card block">
      <LuxuryCard className="transition hover:border-champagne-300/60">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold leading-tight">{client.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground md:text-sm"><Phone className="size-3.5" />{client.phone}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full border border-champagne-700/50 px-2 py-1 text-[11px] font-semibold text-champagne-100">
            <Crown className="size-3" />{client.vip_level}
          </span>
        </div>
      </LuxuryCard>
    </Link>
  );
}
