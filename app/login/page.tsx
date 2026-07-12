import { LuxuryCard } from "@/components/ui/luxury-card";
import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.32em] text-champagne-300">Private access</p>
        <h1 className="mt-3 font-serif text-4xl text-foreground">Night Concierge</h1>
        <p className="mt-3 text-muted-foreground">Sign in with Supabase magic links or email/password once configured.</p>
      </div>
      <LuxuryCard>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-secondary" />}>
          <LoginForm />
        </Suspense>
      </LuxuryCard>
    </main>
  );
}
