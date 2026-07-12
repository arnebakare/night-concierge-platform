"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ClientSearch({ placeholder = "Search clients" }: Readonly<{ placeholder?: string }>) {
  return (
    <form action="/clients" className="grid grid-cols-[1fr_auto] gap-2"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-champagne-300" /><Input name="q" className="pl-10" placeholder={placeholder} /></div><Button type="submit" variant="secondary">Search</Button></form>
  );
}
