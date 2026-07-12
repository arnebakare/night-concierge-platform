export default function Loading() {
  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-6xl animate-pulse space-y-4">
        <div className="h-4 w-28 rounded bg-secondary" />
        <div className="h-10 w-64 rounded bg-secondary" />
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-36 rounded-lg border border-champagne-700/30 bg-card" />)}
        </div>
      </div>
    </main>
  );
}
