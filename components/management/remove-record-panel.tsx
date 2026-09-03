import { ArchiveX } from "lucide-react";
import { removeClientFromCrm, removeRequestFromCrm } from "@/lib/actions/management-actions";
import { StatusSubmitButton } from "@/components/request/status-submit-button";

export function RemoveRecordPanel({
  recordType,
  recordId,
  label
}: Readonly<{ recordType: "client" | "request"; recordId: string; label: string }>) {
  const action = recordType === "client" ? removeClientFromCrm : removeRequestFromCrm;
  const idName = recordType === "client" ? "clientId" : "requestId";

  return (
    <details className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-950">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
        <span className="inline-flex items-center gap-2"><ArchiveX className="size-4" /> Remove from CRM</span>
        <span className="text-xs font-medium text-rose-700">Hidden from normal lists</span>
      </summary>
      <form action={action} className="mt-3 grid gap-2">
        <input type="hidden" name={idName} value={recordId} />
        <label className="grid gap-1">
          <span className="text-xs font-medium text-rose-800">Reason optional</span>
          <textarea
            name="reason"
            rows={2}
            placeholder={`Why remove ${label}?`}
            className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-rose-400"
          />
        </label>
        <p className="text-xs leading-5 text-rose-700">This does not permanently delete history. It hides the record and keeps an audit log.</p>
        <StatusSubmitButton label={`Remove ${label}`} pendingLabel="Removing" variant="outline" className="border-rose-300 bg-white text-rose-800 hover:bg-rose-100" />
      </form>
    </details>
  );
}
