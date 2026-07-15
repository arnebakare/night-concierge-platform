"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, BrainCircuit, Briefcase, CalendarDays, Crown, HeartHandshake, Home, Inbox, Link2, Settings, User, Users } from "lucide-react";
import { useExperienceMode } from "@/components/layout/experience-mode";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

type NavItem = [string, string, typeof Home, advancedOnly?: boolean];

const items = {
  PROMOTER: [
    ["/dashboard", "Home", Home],
    ["/requests/lead", "Paste lead", Inbox],
    ["/requests", "Requests", Inbox],
    ["/clients", "Clients", Users],
    ["/links", "Links", Link2],
    ["/schedule", "Schedule", CalendarDays],
    ["/reports", "Reports", Crown, true],
    ["/profile", "Profile", User]
  ],
  PROMOTER_MANAGER: [
    ["/manager", "Overview", Home],
    ["/requests/lead", "Paste lead", Inbox],
    ["/manager/requests", "Inbox", Inbox],
    ["/manager/clients", "CRM", Users],
    ["/manager/promoters", "Team", Crown],
    ["/manager/retention", "Retention", HeartHandshake],
    ["/links", "Links", Link2],
    ["/schedule", "Schedule", CalendarDays],
    ["/manager/clubs", "Clubs", Briefcase, true],
    ["/manager/events", "Events", Link2, true],
    ["/settings", "Settings", Settings],
    ["/profile", "Profile", User],
    ["/notifications", "WhatsApp delivery", Bell, true]
  ],
  SUPER_ADMIN: [
    ["/admin", "Overview", Home],
    ["/admin/clubs", "Clubs", Briefcase],
    ["/admin/planner", "Planner rules", BrainCircuit],
    ["/admin/users", "Users", Users],
    ["/manager/requests", "Requests", Inbox],
    ["/manager/retention", "Retention", HeartHandshake],
    ["/admin/settings", "Settings", Settings],
    ["/profile", "Profile", User],
    ["/notifications", "WhatsApp delivery", Bell],
    ["/admin/system", "Launch readiness", Activity]
  ],
  CLIENT: [
    ["/client", "Home", Home],
    ["/client/requests", "Requests", Inbox],
    ["/request", "New request", Crown],
    ["/profile", "Profile", User]
  ]
} satisfies Record<Role, NavItem[]>;

export function DesktopSidebar({ role }: Readonly<{ role: Role }>) {
  const { mode } = useExperienceMode();
  const pathname = usePathname();
  const visibleItems = items[role].filter((item) => mode === "advanced" || !item[3]);

  return (
    <aside className="sticky top-0 hidden h-screen w-72 border-r border-champagne-700/30 bg-ink-900/80 p-6 backdrop-blur md:block">
      <Link href="/" className="block">
        <p className="text-xs uppercase tracking-[0.32em] text-champagne-300">Night</p>
        <h1 className="mt-2 font-serif text-2xl">Concierge</h1>
      </Link>
      <nav className="mt-10 space-y-2">
        {visibleItems.map(([href, label, Icon]) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground",
              active && "border border-champagne-700/40 bg-champagne-300/10 text-champagne-100 shadow-glow"
            )}
          >
            <Icon className="size-4 text-champagne-300" />
            {label}
          </Link>
          );
        })}
      </nav>
    </aside>
  );
}
