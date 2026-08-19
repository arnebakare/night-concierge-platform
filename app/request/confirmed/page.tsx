import Link from "next/link";
import { CheckCircle2, MessageCircle, ShieldCheck, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ConfirmedPage({ searchParams }: Readonly<{ searchParams: Promise<{ id?: string }> }>) {
  const { id } = await searchParams;
  return (
    <main className="request-marina-bg relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,6,0.18)_0%,rgba(5,5,6,0.68)_42%,rgba(5,5,6,0.98)_100%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-3.5 py-10">
      <section className="overflow-hidden rounded-[1.35rem] border border-champagne-300/28 bg-ink-950/78 p-5 text-center shadow-[0_24px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-champagne-400/40 bg-champagne-300/10 shadow-glow">
          <CheckCircle2 className="size-8 text-champagne-300" />
        </div>
        <p className="mt-5 text-[11px] uppercase tracking-[0.24em] text-champagne-300">Request sent</p>
        <h1 className="mt-2 font-serif text-[2.55rem] leading-[0.95]">We have your details.</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
          A host will check availability and reply personally on WhatsApp. Your phone number keeps future requests connected to the same client profile.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-left">
          <NextStep icon={MessageCircle} label="Reply" />
          <NextStep icon={Timer} label="Check" />
          <NextStep icon={ShieldCheck} label="Confirm" />
        </div>
        <div className="mt-4 space-y-2 text-left text-sm text-muted-foreground">
          <div className="flex items-start gap-3 rounded-xl border border-champagne-700/24 bg-white/[0.045] p-3">
            <MessageCircle className="mt-0.5 size-4 shrink-0 text-champagne-300" />
            <span>The team will confirm venue availability, timing, spend, and any door details before anything is final.</span>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-champagne-700/24 bg-white/[0.045] p-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-champagne-300" />
            <span>If you need something special, reply directly to your host in the same WhatsApp chat.</span>
          </div>
        </div>
        {id && <p className="mt-5 text-xs uppercase tracking-[0.18em] text-champagne-300">Reference {id.slice(0, 8).toUpperCase()}</p>}
        <Button asChild className="mt-6 w-full rounded-xl" size="lg">
          <Link href="/request">Create another request</Link>
        </Button>
      </section>
      </div>
    </main>
  );
}

function NextStep({ icon: Icon, label }: Readonly<{ icon: typeof MessageCircle; label: string }>) {
  return (
    <div className="rounded-xl border border-champagne-700/24 bg-white/[0.045] px-2 py-2 text-center">
      <Icon className="mx-auto size-4 text-champagne-300" />
      <p className="mt-1 truncate text-[11px] font-semibold text-champagne-50">{label}</p>
    </div>
  );
}
