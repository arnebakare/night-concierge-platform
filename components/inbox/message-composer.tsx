"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function MessageComposer({ conversationId }: Readonly<{ conversationId: string }>) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (!body.trim() || pending) return;
    setPending(true);
    setError("");
    const response = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, body: body.trim() })
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) setError(result.error ?? "Could not send message.");
    else {
      setBody("");
      router.refresh();
    }
    setPending(false);
  }

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void send();
          }
        }}
        maxLength={4000}
        rows={3}
        placeholder="Write a reply for the customer…"
        className="resize-none border-slate-200 bg-white text-slate-950"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Nothing is sent until you press Send.</p>
        <Button type="button" onClick={() => void send()} disabled={pending || !body.trim()}>
          <Send className="size-4" /> {pending ? "Sending" : "Send"}
        </Button>
      </div>
      {error && <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
