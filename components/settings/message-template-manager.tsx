import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <LuxuryCard className="mt-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-champagne-500/10 p-2 text-champagne-300">
          <MessageSquareText className="size-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-champagne-300">Message templates</p>
          <h2 className="mt-1 text-lg font-semibold">Suggested replies</h2>
          <p className="mt-1 text-sm text-muted-foreground">Edit the short messages used by the booking assistant. English is the default.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {variables.map((variable) => <code key={variable} className="rounded bg-secondary px-2 py-1 text-xs text-muted-foreground">{variable}</code>)}
      </div>
      <div className="grid gap-3">
        {activeTemplates.map((template) => (
          <form key={template.id} action={saveMessageTemplate} className="rounded-lg border border-border bg-secondary/40 p-3">
            <input type="hidden" name="templateId" value={template.id} />
            <input type="hidden" name="active" value="true" />
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <Label>{template.label}</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">{template.language.toUpperCase()} · {template.channel.toLowerCase()}</p>
              </div>
              <Button type="submit" size="sm">Save</Button>
            </div>
            <Textarea name="body" defaultValue={template.body} className="min-h-28 resize-y leading-relaxed" />
          </form>
        ))}
      </div>
    </LuxuryCard>
  );
}
