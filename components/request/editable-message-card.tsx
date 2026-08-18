"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { Textarea } from "@/components/ui/textarea";
import { whatsAppHref } from "@/lib/sales/funnel";

export function EditableMessageCard({
  title,
  text,
  phone
}: Readonly<{ title: string; text: string; phone?: string | null }>) {
  const [message, setMessage] = useState(text);
  const [copied, setCopied] = useState(false);
  const href = useMemo(() => whatsAppHref(phone, message), [phone, message]);
  const canOpen = href !== "#";

  async function copy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <LuxuryCard className="message-panel space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><MessageCircle className="size-4 text-champagne-300" /> {title}</p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={copy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          {phone && (
            <Button asChild variant="secondary" size="sm" aria-disabled={!canOpen}>
              <a href={href} target="_blank" rel="noreferrer" className={!canOpen ? "pointer-events-none opacity-50" : ""}>
                <ExternalLink className="size-4" /> Open
              </a>
            </Button>
          )}
        </div>
      </div>
      <Textarea value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-32 resize-none leading-relaxed" />
    </LuxuryCard>
  );
}
