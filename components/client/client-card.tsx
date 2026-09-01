import Link from "next/link";
import { Barcode, BellRing, Crown, Globe2, Languages, Phone, ShieldAlert } from "lucide-react";
import { LuxuryCard } from "@/components/ui/luxury-card";
import type { Client, ClientCareSignal } from "@/lib/types";
import { formatCustomerCode } from "@/lib/concierge/phone";
import { formatEnum } from "@/lib/utils";

export function ClientCard({ client, href, careSignal }: Readonly<{ client: Client; href: string; careSignal?: ClientCareSignal }>) {
  const initials = client.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const needsCare = Boolean(careSignal?.overdue_tasks || careSignal?.high_priority_tasks);

  return (
    <Link href={href} className="client-card block">
      <LuxuryCard className={`client-row bg-white text-ink-950 transition hover:border-slate-300 hover:shadow-sm ${needsCare ? "border-amber-200" : ""}`}>
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1.25fr)_minmax(180px,0.85fr)_auto] sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
              {initials || "VIP"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-tight text-slate-950">{client.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
                <Phone className="size-3.5 shrink-0" />{client.phone}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] font-medium text-slate-400">
                <Barcode className="size-3.5 shrink-0" />{client.client_code ? `SKU ${client.client_code}` : formatCustomerCode(client.phone)}
              </p>
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap gap-1.5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
              <ShieldAlert className="size-3.5" />{formatEnum(client.status)}
            </span>
            {client.country && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                <Globe2 className="size-3.5" />{client.country}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
              <Languages className="size-3.5" />{(client.preferred_language ?? "en").toUpperCase()}
            </span>
            {careSignal?.open_tasks ? (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${needsCare ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                <BellRing className="size-3.5" />
                {careSignal.overdue_tasks ? `${careSignal.overdue_tasks} due` : careSignal.high_priority_tasks ? "High care" : "Care set"}
              </span>
            ) : null}
          </div>
          <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 sm:justify-self-end">
            <Crown className="mr-1 inline size-3" />{client.vip_level}
          </span>
        </div>
      </LuxuryCard>
    </Link>
  );
}
