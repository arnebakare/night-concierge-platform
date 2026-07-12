"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, HeartHandshake, Home, Link2, Search, Settings, Users, User, Inbox, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useExperienceMode } from "@/components/layout/experience-mode";
import type { Role } from "@/lib/types";

const navByRole: Record<Role, { href: string; label: string; icon: typeof Home }[]> = {
  PROMOTER: [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/requests", label: "Requests", icon: Inbox },
    { href: "/clients", label: "Clients", icon: Search },
    { href: "/links", label: "Links", icon: Link2 },
    { href: "/profile", label: "Profile", icon: User }
  ],
  PROMOTER_MANAGER: [
    { href: "/manager", label: "Home", icon: Home },
    { href: "/manager/requests", label: "Inbox", icon: Inbox },
    { href: "/manager/clients", label: "Clients", icon: Search },
    { href: "/manager/retention", label: "Care", icon: HeartHandshake },
    { href: "/links", label: "Links", icon: Link2 }
  ],
  SUPER_ADMIN: [
    { href: "/admin", label: "Home", icon: Crown },
    { href: "/admin/clubs", label: "Clubs", icon: Briefcase },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/manager/requests", label: "Inbox", icon: Inbox },
    { href: "/admin/settings", label: "More", icon: Settings }
  ],
  CLIENT: [
    { href: "/client", label: "Home", icon: Home },
    { href: "/client/requests", label: "Requests", icon: Inbox },
    { href: "/request", label: "New", icon: Crown },
    { href: "/profile", label: "Profile", icon: User }
  ]
};

export function MobileBottomNav({ role }: Readonly<{ role: Role }>) {
  const pathname = usePathname();
  const { mode } = useExperienceMode();
  const items = navByRole[role].map((item) => {
    if (mode === "easy" && role === "PROMOTER_MANAGER" && item.href === "/manager/requests") return { ...item, label: "Requests" };
    return item;
  });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-champagne-700/30 bg-ink-900/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-medium text-muted-foreground",
                active && "bg-champagne-500/12 text-champagne-100"
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
