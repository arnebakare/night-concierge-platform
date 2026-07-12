"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return <main className="flex min-h-screen items-center justify-center bg-background px-4"><div className="w-full max-w-md rounded-lg border border-champagne-700/40 bg-card p-6 text-center"><p className="text-xs uppercase tracking-[0.25em] text-champagne-300">Night Concierge</p><h1 className="mt-3 font-serif text-3xl">Something went wrong</h1><p className="mt-3 text-sm text-muted-foreground">Your information is safe. Please try this action again.</p><Button onClick={reset} className="mt-6 w-full">Try again</Button></div></main>;
}
