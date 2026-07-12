import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ClientSearchForm({
  action,
  value,
  placeholder = "Search clients"
}: Readonly<{ action: string; value?: string; placeholder?: string }>) {
  return (
    <form action={action} className="rounded-lg border border-champagne-700/40 bg-card/80 p-3">
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-champagne-300" />
          <Input name="q" defaultValue={value ?? ""} className="pl-10" placeholder={placeholder} />
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <Button type="submit">Search</Button>
          <Button asChild variant="secondary">
            <Link href={action}>Clear</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
