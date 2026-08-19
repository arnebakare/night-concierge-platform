import Link from "next/link";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ClientSearchForm({
  action,
  value,
  placeholder = "Search clients"
}: Readonly<{ action: string; value?: string; placeholder?: string }>) {
  return (
    <form action={action} role="search" className="client-search-bar rounded-lg border border-champagne-700/40 bg-card/80 p-2">
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-champagne-300" />
          <Input name="q" defaultValue={value ?? ""} className="pl-9" placeholder={placeholder} aria-label={placeholder} />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 md:flex">
          <Button type="submit" size="sm">Search</Button>
          <Button asChild variant="secondary" size="sm" aria-label="Clear search">
            <Link href={action}><X className="size-4" /><span className="sr-only">Clear</span></Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
