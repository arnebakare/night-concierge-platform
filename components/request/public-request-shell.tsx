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
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6">
        <header className="mb-6 pt-4">
          <div className="mb-5 inline-flex rounded-full border border-champagne-400/40 bg-ink-900/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-champagne-200 backdrop-blur">
            Marbella concierge
          </div>
          <p className="text-xs uppercase tracking-[0.32em] text-champagne-300">{eyebrow}</p>
          <h1 className="mt-3 font-serif text-5xl leading-[0.95] text-foreground drop-shadow-2xl">{title}</h1>
          <p className="mt-4 max-w-sm text-base leading-6 text-champagne-50/82">{description}</p>
        </header>
        {children}
      </div>
    </main>
  );
}
