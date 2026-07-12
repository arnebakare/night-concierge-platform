import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";

export default async function ConfirmedPage({ searchParams }: Readonly<{ searchParams: Promise<{ id?: string }> }>) {
  const { id } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <LuxuryCard className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-champagne-300" />
        <h1 className="mt-5 font-serif text-4xl">Request received</h1>
        <p className="mt-3 text-muted-foreground">
          The concierge team has your details. A host will review the request and follow up on WhatsApp.
        </p>
        {id && <p className="mt-4 text-xs uppercase tracking-[0.18em] text-champagne-300">Reference {id.slice(0, 8).toUpperCase()}</p>}
        <Button asChild className="mt-6 w-full" size="lg">
          <Link href="/request">Create another request</Link>
        </Button>
      </LuxuryCard>
    </main>
  );
}
