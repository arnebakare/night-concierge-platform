import Link from "next/link";
import { Smartphone } from "lucide-react";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <main className="request-marina-bg relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,6,0.24)_0%,rgba(5,5,6,0.78)_45%,rgba(5,5,6,0.98)_100%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.32em] text-champagne-300">Private access</p>
        <h1 className="mt-3 font-serif text-4xl text-foreground">Night Concierge</h1>
        <p className="mt-3 text-sm leading-6 text-champagne-50/82">Sign in to manage requests, clients, links, and schedules.</p>
      </div>
      <LuxuryCard className="border-champagne-300/35 bg-ink-900/86 shadow-[0_24px_90px_rgba(0,0,0,0.48)]">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-secondary" />}>
          <LoginForm />
        </Suspense>
      </LuxuryCard>
      <Link href="/install" className="mt-5 inline-flex items-center justify-center gap-2 text-center text-sm text-muted-foreground underline-offset-4 hover:text-champagne-300 hover:underline">
        <Smartphone className="size-4" /> Install on iPhone
      </Link>
      </div>
    </main>
  );
}
