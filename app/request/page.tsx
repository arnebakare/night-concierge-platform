import { RequestFormSteps } from "@/components/request/request-form-steps";
import { getActiveClubs } from "@/lib/data/public";

export const dynamic = "force-dynamic";

export default async function PublicRequestPage() {
  const clubs = await getActiveClubs();

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-6">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.32em] text-champagne-300">VIP Request</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight">Your night, handled.</h1>
        <p className="mt-3 text-muted-foreground">Request guestlist, tables, and private service in under a minute.</p>
      </header>
      <RequestFormSteps clubs={clubs} />
    </main>
  );
}
