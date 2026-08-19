export function PublicRequestShell({
  eyebrow,
  title,
  description,
  hostLine,
  children
}: Readonly<{ eyebrow: string; title: string; description: string; hostLine?: string; children: React.ReactNode }>) {
  return (
    <main className="request-marina-bg relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,6,0.2)_0%,rgba(5,5,6,0.58)_34%,rgba(5,5,6,0.98)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(219,178,92,0.2),transparent_64%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-champagne-300/70 to-transparent" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-3.5 pt-4">
        <header className="pb-3 pt-2">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-champagne-400/35 bg-ink-900/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne-200 shadow-glow backdrop-blur">
            <span className="size-1.5 rounded-full bg-champagne-300" />
            Direct Marbella hosting
          </div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-champagne-300">{eyebrow}</p>
          <h1 className="mt-2 max-w-[13ch] font-serif text-[2.85rem] leading-[0.94] text-foreground drop-shadow-2xl">{title}</h1>
          <p className="mt-3 max-w-sm text-[15px] leading-6 text-champagne-50/88">{description}</p>
          {hostLine && <p className="mt-3 rounded-lg border border-champagne-700/30 bg-ink-950/42 px-3 py-2 text-[13px] leading-5 text-champagne-100/82 backdrop-blur">{hostLine}</p>}
          <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-2xl border border-champagne-700/24 bg-ink-950/48 text-center backdrop-blur">
            <TrustStat label="Reply" value="WhatsApp" />
            <TrustStat label="Booking" value="Checked" />
            <TrustStat label="Profile" value="By phone" />
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}

function TrustStat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="border-l border-champagne-700/24 px-2 py-2 first:border-l-0">
      <p className="text-[10px] uppercase tracking-[0.14em] text-champagne-300/80">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-champagne-50">{value}</p>
    </div>
  );
}
