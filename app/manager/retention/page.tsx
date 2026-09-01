import { AppShell } from "@/components/layout/app-shell";
import { RetentionClientCard } from "@/components/client/retention-client-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LuxuryCard } from "@/components/ui/luxury-card";
import Link from "next/link";
import { updateClientFollowUpTaskStatus } from "@/lib/actions/management-actions";
import { requireProfile } from "@/lib/auth";
import { getMessageTemplates, getOpenFollowUpTasksForProfile, getRetentionClientsForProfile } from "@/lib/data/app";
import { getEmailConfigStatus } from "@/lib/services/email";
import { getWhatsAppConfigStatus } from "@/lib/services/whatsapp";
import type { ClientFollowUpTask } from "@/lib/types";

export default async function RetentionPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ days?: string; task?: string }> }>) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const params = await searchParams;
  const days = Number.parseInt(params.days ?? "45", 10);
  const threshold = Number.isFinite(days) && days > 0 ? days : 45;
  const today = new Date().toISOString().slice(0, 10);
  const taskFilter = params.task === "overdue" || params.task === "high" ? params.task : "all";
  const [clients, tasks, templates, emailConfig] = await Promise.all([
    getRetentionClientsForProfile(profile, threshold),
    getOpenFollowUpTasksForProfile(profile, taskFilter === "high" ? { priority: "HIGH" } : taskFilter === "overdue" ? { dueBefore: today } : undefined),
    getMessageTemplates(),
    Promise.resolve(getEmailConfigStatus())
  ]);
  const whatsAppConfig = getWhatsAppConfigStatus("+34000000000");

  return (
    <AppShell profile={profile} title="Retention" eyebrow="Client care">
      <LuxuryCard className="mb-4">
        <form action="/manager/retention" className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="font-serif text-2xl">Clients to re-activate</p>
            <p className="mt-1 text-sm text-muted-foreground">Find clients who have not booked recently and send a personal check-in.</p>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input name="days" type="number" min={7} defaultValue={threshold} aria-label="Dormant days" />
            <Button type="submit">Apply</Button>
          </div>
        </form>
      </LuxuryCard>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <ConfigCard label="WhatsApp" ready={whatsAppConfig.accountSidConfigured && whatsAppConfig.authTokenConfigured && whatsAppConfig.fromConfigured} detail={whatsAppConfig.fromConfigured ? "Twilio sender configured" : "Add Twilio sender in Vercel"} />
        <ConfigCard label="Email" ready={emailConfig.ready} detail={emailConfig.ready ? `Sending from ${emailConfig.from}` : "Add RESEND_API_KEY and EMAIL_FROM in Vercel"} />
      </div>

      <LuxuryCard className="mb-4 bg-white text-slate-950">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-champagne-700">Due follow-ups</p>
            <h2 className="mt-1 text-lg font-semibold">What needs attention</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{tasks.length} open</span>
        </div>
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          <FilterButton href={`/manager/retention?days=${threshold}`} active={taskFilter === "all"} label="All" />
          <FilterButton href={`/manager/retention?days=${threshold}&task=overdue`} active={taskFilter === "overdue"} label="Due now" />
          <FilterButton href={`/manager/retention?days=${threshold}&task=high`} active={taskFilter === "high"} label="High priority" />
        </div>
        <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200">
          {tasks.slice(0, 12).map((task) => <TaskRow key={task.id} task={task} />)}
          {!tasks.length && <div className="p-5 text-center text-sm text-slate-500">No open follow-ups right now.</div>}
        </div>
      </LuxuryCard>

      <div className="compact-list grid gap-2">
        {clients.length ? clients.map((client) => <RetentionClientCard key={client.id} client={client} templates={templates} />) : (
          <LuxuryCard className="text-center text-sm text-muted-foreground">
            No clients match this retention window.
          </LuxuryCard>
        )}
      </div>
    </AppShell>
  );
}

function TaskRow({ task }: Readonly<{ task: ClientFollowUpTask }>) {
  const overdue = Boolean(task.due_date && task.due_date < new Date().toISOString().slice(0, 10));
  return (
    <div className="grid gap-2 bg-white p-3 text-sm md:grid-cols-[1fr_auto_auto] md:items-center">
      <div className="min-w-0">
        <Link href={`/manager/clients/${task.client_id}`} className="truncate font-semibold text-slate-950 hover:underline">{task.title}</Link>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {task.clients?.name ?? "Client"} · {task.due_date ? `${overdue ? "Overdue" : "Due"} ${task.due_date}` : "No due date"} · {task.assignee?.name ?? task.assignee?.email ?? "Unassigned"}
        </p>
      </div>
      <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${task.priority === "HIGH" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
        {task.priority.toLowerCase()}
      </span>
      <form action={updateClientFollowUpTaskStatus}>
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="clientId" value={task.client_id} />
        <input type="hidden" name="status" value="DONE" />
        <Button type="submit" size="sm" variant="secondary" className="bg-slate-100 text-slate-900 hover:bg-slate-200">Done</Button>
      </form>
    </div>
  );
}

function FilterButton({ href, active, label }: Readonly<{ href: string; active: boolean; label: string }>) {
  return (
    <Button asChild size="sm" variant={active ? "default" : "secondary"} className={active ? "bg-slate-950 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-900 hover:bg-slate-200"}>
      <Link href={href}>{label}</Link>
    </Button>
  );
}

function ConfigCard({ label, ready, detail }: Readonly<{ label: string; ready: boolean; detail: string }>) {
  return (
    <LuxuryCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
        <span className={ready ? "text-xs font-semibold text-emerald-400" : "text-xs font-semibold text-red-300"}>
          {ready ? "READY" : "SETUP"}
        </span>
      </div>
    </LuxuryCard>
  );
}
