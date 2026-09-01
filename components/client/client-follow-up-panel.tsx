import { Clock3, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { StatusSubmitButton } from "@/components/request/status-submit-button";
import { createClientFollowUpTask, updateClientFollowUpTask, updateClientFollowUpTaskStatus } from "@/lib/actions/management-actions";
import type { ClientFollowUpTask, Profile } from "@/lib/types";

export function ClientFollowUpPanel({
  clientId,
  tasks,
  assignees
}: Readonly<{ clientId: string; tasks: ClientFollowUpTask[]; assignees: Profile[] }>) {
  const openTasks = tasks.filter((task) => task.status === "OPEN");
  return (
    <LuxuryCard className="bg-white text-slate-950">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-champagne-700">Next action</p>
          <h3 className="mt-1 text-lg font-semibold">Follow-up tasks</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{openTasks.length} open</span>
      </div>

      <details className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between text-sm font-semibold">
          Add task <Plus className="size-4 text-champagne-700" />
        </summary>
        <form action={createClientFollowUpTask} className="mt-3 grid gap-2 md:grid-cols-[1fr_150px_150px_150px_auto]">
          <input type="hidden" name="clientId" value={clientId} />
          <Field label="What to do">
            <Input name="title" required minLength={3} placeholder="Send weekend options" className="bg-white text-slate-950" />
          </Field>
          <Field label="Due">
            <Input name="dueDate" type="date" className="bg-white text-slate-950" />
          </Field>
          <Field label="Priority">
            <select name="priority" defaultValue="NORMAL" className="h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
            </select>
          </Field>
          <Field label="Owner">
            <select name="assignedTo" className="h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
              <option value="">Me</option>
              {assignees.map((user) => <option key={user.id} value={user.id}>{user.name ?? user.email}</option>)}
            </select>
          </Field>
          <StatusSubmitButton label="Save" pendingLabel="Saving" className="self-end bg-slate-950 text-white hover:bg-slate-800" />
        </form>
      </details>

      <div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200">
        {tasks.map((task) => <TaskRow key={task.id} task={task} />)}
        {!tasks.length && <p className="p-4 text-center text-sm text-slate-500">No follow-up tasks yet.</p>}
      </div>
    </LuxuryCard>
  );
}

function TaskRow({ task }: Readonly<{ task: ClientFollowUpTask }>) {
  const done = task.status === "DONE";
  return (
    <div className={`grid gap-2 p-3 text-sm md:grid-cols-[1fr_auto_auto] md:items-center ${done ? "bg-slate-50 text-slate-500" : "bg-white text-slate-950"}`}>
      <div className="min-w-0">
        <p className="truncate font-semibold">{task.title}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {task.due_date ? `Due ${new Date(`${task.due_date}T12:00:00`).toLocaleDateString()}` : "No due date"} · {task.assignee?.name ?? task.assignee?.email ?? "Unassigned"}
        </p>
      </div>
      <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${task.priority === "HIGH" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
        <Clock3 className="size-3.5" /> {task.priority.toLowerCase()}
      </span>
      {!done && (
        <div className="flex flex-wrap gap-2 md:justify-end">
          <form action={updateClientFollowUpTaskStatus}>
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="clientId" value={task.client_id} />
            <input type="hidden" name="status" value="DONE" />
            <StatusSubmitButton label="Done" pendingLabel="Saving" size="sm" variant="secondary" className="bg-slate-100 text-slate-900 hover:bg-slate-200" />
          </form>
          <form action={updateClientFollowUpTaskStatus}>
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="clientId" value={task.client_id} />
            <input type="hidden" name="status" value="CANCELLED" />
            <StatusSubmitButton label="Cancel" pendingLabel="Cancelling" size="sm" variant="secondary" className="bg-slate-100 text-slate-900 hover:bg-slate-200" />
          </form>
        </div>
      )}
      {!done && (
        <details className="rounded-md border border-slate-200 bg-slate-50 p-2 md:col-span-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-600">Edit</summary>
          <form action={updateClientFollowUpTask} className="mt-3 grid gap-2 md:grid-cols-[1fr_150px_150px_auto]">
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="clientId" value={task.client_id} />
            <Field label="Task">
              <Input name="title" defaultValue={task.title} required minLength={3} className="bg-white text-slate-950" />
            </Field>
            <Field label="Due">
              <Input name="dueDate" type="date" defaultValue={task.due_date ?? ""} className="bg-white text-slate-950" />
            </Field>
            <Field label="Priority">
              <select name="priority" defaultValue={task.priority} className="h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
              </select>
            </Field>
            <StatusSubmitButton label="Save" pendingLabel="Saving" className="self-end bg-slate-950 text-white hover:bg-slate-800" />
          </form>
        </details>
      )}
    </div>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return <div className="space-y-1.5"><Label className="text-slate-700">{label}</Label>{children}</div>;
}
