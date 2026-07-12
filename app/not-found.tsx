import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return <main className="flex min-h-screen items-center justify-center bg-background px-4"><div className="w-full max-w-md rounded-lg border border-champagne-700/40 bg-card p-6 text-center"><p className="text-xs uppercase tracking-[0.25em] text-champagne-300">Private access</p><h1 className="mt-3 font-serif text-3xl">This page is unavailable</h1><p className="mt-3 text-sm text-muted-foreground">The link may have expired, moved, or no longer be available to your account.</p><Button asChild className="mt-6 w-full"><Link href="/">Return home</Link></Button></div></main>;
}
