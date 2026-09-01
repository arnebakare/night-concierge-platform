import { MessageSquareText } from "lucide-react";
import { StatusSubmitButton } from "@/components/request/status-submit-button";
import { Label } from "@/components/ui/label";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { Textarea } from "@/components/ui/textarea";
import { saveMessageTemplate } from "@/lib/actions/management-actions";
import type { MessageTemplate } from "@/lib/types";

const editableTemplateKeys = ["client_reply", "venue_check", "client_offer", "retention_checkin"];
const variables = ["{{client_first_name}}", "{{client_name}}", "{{venue_name}}", "{{date}}", "{{guest_count}}", "{{request_type}}", "{{budget_line}}"];

export function MessageTemplateManager({ templates }: Readonly<{ templates: MessageTemplate[] }>) {
  const activeTemplates = templates.filter((template) => editableTemplateKeys.includes(template.key));

  return (
    <LuxuryCard className="mt-4 space-y-4 bg-white text-slate-950">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-champagne-100 p-2 text-champagne-800">
          <MessageSquareText className="size-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-champagne-700">Message templates</p>
          <h2 className="mt-1 text-lg font-semibold">Suggested replies</h2>
          <p className="mt-1 text-sm text-slate-500">Edit the short messages used by the booking assistant. English is the default.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {variables.map((variable) => <code key={variable} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">{variable}</code>)}
      </div>
      <div className="grid gap-3">
        {activeTemplates.map((template) => (
          <form key={template.id} action={saveMessageTemplate} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <input type="hidden" name="templateId" value={template.id} />
            <input type="hidden" name="active" value="true" />
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <Label className="text-slate-800">{template.label}</Label>
                <p className="mt-0.5 text-xs text-slate-500">{template.language.toUpperCase()} · {template.channel.toLowerCase()}</p>
              </div>
              <StatusSubmitButton label="Save" pendingLabel="Saving" size="sm" />
            </div>
            <Textarea name="body" defaultValue={template.body} className="min-h-28 resize-y border-slate-200 bg-white leading-relaxed text-slate-950" />
          </form>
        ))}
      </div>
    </LuxuryCard>
  );
}
