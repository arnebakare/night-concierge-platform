import Link from "next/link";
import { Crown, Phone } from "lucide-react";
import { LuxuryCard } from "@/components/ui/luxury-card";
import type { Client } from "@/lib/types";

export function ClientCard({ client, href }: Readonly<{ client: Client; href: string }>) {
  return (
    <Link href={href}>
      <LuxuryCard className="transition hover:border-champagne-300/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{client.name}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Phone className="size-4" />{client.phone}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full border border-champagne-700/50 px-2 py-1 text-xs text-champagne-100">
            <Crown className="size-3" />{client.vip_level}
          </span>
        </div>
      </LuxuryCard>
    </Link>
  );
}
