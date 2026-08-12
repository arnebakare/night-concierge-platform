import Link from "next/link";
import { CheckCircle2, ExternalLink, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";

export default function InstallPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.3em] text-champagne-300">iPhone access</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-foreground">Install Night Concierge</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Add it to the Home Screen so it opens like an app, with the bottom navigation and full-screen workspace.
        </p>
      </div>

      <LuxuryCard className="space-y-4">
        <InstallStep icon={ExternalLink} title="Open this page in Safari" text="If this opened inside WhatsApp or Instagram, tap the browser menu and open it in Safari first." />
        <InstallStep icon={Share} title="Tap Share" text="Use the iPhone share button at the bottom of Safari." />
        <InstallStep icon={Smartphone} title="Tap Add to Home Screen" text="Keep the name Concierge, then tap Add." />
        <InstallStep icon={CheckCircle2} title="Open from the new icon" text="After login, the app opens the correct dashboard for your role." />
      </LuxuryCard>

      <div className="mt-5 grid gap-3">
        <Button asChild size="lg">
          <Link href="/app">Open app</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/request">Open booking form</Link>
        </Button>
      </div>
    </main>
  );
}

function InstallStep({
  icon: Icon,
  title,
  text
}: Readonly<{ icon: typeof Share; title: string; text: string }>) {
  return (
    <div className="flex gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-champagne-700/40 bg-secondary text-champagne-300">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="font-semibold text-champagne-100">{title}</p>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
