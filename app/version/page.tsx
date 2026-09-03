import { getBuildInfo } from "@/lib/services/build-info";

export default function VersionPage() {
  const build = getBuildInfo();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Night Concierge</p>
        <h1 className="mt-2 text-2xl font-semibold">Live version</h1>
        <div className="mt-5 grid gap-2 text-sm">
          <Line label="Commit" value={build.shortSha} />
          <Line label="Branch" value={build.branch} />
          <Line label="Environment" value={build.environment} />
          <Line label="Message" value={build.commitMessage} />
        </div>
      </div>
    </main>
  );
}

function Line({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold">{value || "Not available"}</p>
    </div>
  );
}
