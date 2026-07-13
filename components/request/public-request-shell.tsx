export function PublicRequestShell({
  eyebrow,
  title,
  description,
  children
}: Readonly<{ eyebrow: string; title: string; description: string; children: React.ReactNode }>) {
  return (
    <main className="request-marina-bg relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,6,0.18)_0%,rgba(5,5,6,0.76)_44%,rgba(5,5,6,0.98)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(219,178,92,0.24),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-champagne-300/70 to-transparent" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6">
        <header className="mb-5 pt-4">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-champagne-400/40 bg-ink-900/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-champagne-200 shadow-glow backdrop-blur">
            <span className="size-1.5 rounded-full bg-champagne-300" />
            Marbella, tonight
          </div>
          <p className="text-xs uppercase tracking-[0.32em] text-champagne-300">{eyebrow}</p>
          <h1 className="mt-3 max-w-[11ch] font-serif text-5xl leading-[0.92] text-foreground drop-shadow-2xl">{title}</h1>
          <p className="mt-4 max-w-sm text-base leading-6 text-champagne-50/85">{description}</p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] uppercase tracking-[0.14em] text-champagne-100/80">
            <span className="rounded-md border border-champagne-700/35 bg-ink-900/45 px-2 py-2 backdrop-blur">Venue</span>
            <span className="rounded-md border border-champagne-700/35 bg-ink-900/45 px-2 py-2 backdrop-blur">Service</span>
            <span className="rounded-md border border-champagne-700/35 bg-ink-900/45 px-2 py-2 backdrop-blur">Details</span>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
