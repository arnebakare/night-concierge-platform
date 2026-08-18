import Link from "next/link";
import { CheckCircle2, FileCheck2, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";

export default async function ConfirmedPage({ searchParams }: Readonly<{ searchParams: Promise<{ id?: string }> }>) {
  const { id } = await searchParams;
  return (
    <main className="request-marina-bg relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,6,0.18)_0%,rgba(5,5,6,0.72)_45%,rgba(5,5,6,0.98)_100%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <LuxuryCard className="border-champagne-300/40 bg-ink-900/86 text-center shadow-[0_24px_90px_rgba(0,0,0,0.48)]">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-champagne-400/50 bg-champagne-300/10">
          <CheckCircle2 className="size-8 text-champagne-300" />
        </div>
        <p className="mt-5 text-xs uppercase tracking-[0.24em] text-champagne-300">Request sent</p>
        <h1 className="mt-2 font-serif text-4xl">We have your details.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          A host will check availability and reply on WhatsApp. Nothing is confirmed until the team gets back to you.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-left text-xs text-muted-foreground">
          <div className="rounded-md border border-champagne-700/35 bg-ink-950/45 p-3">
            <MessageCircle className="mb-2 size-4 text-champagne-300" />
            WhatsApp reply
          </div>
          <div className="rounded-md border border-champagne-700/35 bg-ink-950/45 p-3">
            <FileCheck2 className="mb-2 size-4 text-champagne-300" />
            Written details
          </div>
          <div className="rounded-md border border-champagne-700/35 bg-ink-950/45 p-3">
            <Sparkles className="mb-2 size-4 text-champagne-300" />
            Personal host
          </div>
        </div>
        <p className="mt-4 rounded-md border border-champagne-700/35 bg-ink-950/45 p-3 text-xs leading-5 text-muted-foreground">
          Your host will confirm the venue, date, arrival details, and any minimum spend or door conditions before anything is final.
        </p>
        {id && <p className="mt-5 text-xs uppercase tracking-[0.18em] text-champagne-300">Reference {id.slice(0, 8).toUpperCase()}</p>}
        <Button asChild className="mt-6 w-full" size="lg">
          <Link href="/request">Create another request</Link>
        </Button>
      </LuxuryCard>
      </div>
    </main>
  );
}
