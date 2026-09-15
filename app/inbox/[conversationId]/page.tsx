import Link from "next/link";
import { ArrowLeft, Instagram, LockKeyhole, MessageCircle, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { MessageComposer } from "@/components/inbox/message-composer";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addConversationNote, assignConversation, updateConversationStatus } from "@/lib/actions/messaging-actions";
import { requireProfile } from "@/lib/auth";
import { getTeamPromoters, getUsersForAdmin } from "@/lib/data/app";
import { getConversationDetail } from "@/lib/data/messaging";

export default async function ConversationPage({ params }: Readonly<{ params: Promise<{ conversationId: string }> }>) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const { conversationId } = await params;
  const [{ conversation, messages, notes }, promoters] = await Promise.all([
    getConversationDetail(conversationId),
    profile.role === "SUPER_ADMIN" ? getUsersForAdmin({ role: "PROMOTER", active: "active" }) : profile.role === "PROMOTER_MANAGER" ? getTeamPromoters(profile.id) : Promise.resolve([])
  ]);
  if (!conversation) notFound();
  const ChannelIcon = conversation.channel === "WHATSAPP" ? MessageCircle : Instagram;
  return (
    <AppShell profile={profile} title={conversation.clients?.name ?? "Conversation"} eyebrow={`${conversation.channel.toLowerCase()} conversation`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><Button asChild variant="secondary" size="sm"><Link href="/inbox"><ArrowLeft className="size-4" />Inbox</Link></Button><div className="flex items-center gap-2 text-xs"><span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1.5 font-semibold text-slate-700"><ChannelIcon className="size-3.5" />{conversation.channel === "WHATSAPP" ? "WhatsApp" : "Instagram"}</span><span className="rounded-full bg-white px-2.5 py-1.5 font-semibold text-slate-700">{conversation.status.toLowerCase()}</span></div></div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-slate-950">
          <div className="max-h-[58vh] min-h-[360px] space-y-3 overflow-y-auto p-3 md:p-5">
            {messages.map((message) => <div key={message.id} className={`flex ${message.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}><div className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${message.direction === "OUTBOUND" ? "rounded-br-sm bg-ink-900 text-white" : "rounded-bl-sm border border-slate-200 bg-white text-slate-900"}`}>{message.body && <p className="whitespace-pre-wrap leading-5">{message.body}</p>}{message.attachments?.map((attachment) => attachment.source_url ? <a key={attachment.id} href={attachment.source_url} target="_blank" rel="noreferrer" className="mt-2 block underline">Open {attachment.attachment_type.toLowerCase()}</a> : attachment.external_media_id ? <a key={attachment.id} href={`/api/messages/attachments/${attachment.id}`} target="_blank" rel="noreferrer" className="mt-2 block underline">Open {attachment.attachment_type.toLowerCase()}</a> : <p key={attachment.id} className="mt-2 text-xs opacity-70">{attachment.attachment_type.toLowerCase()} attachment</p>)}<p className={`mt-1 text-[10px] ${message.direction === "OUTBOUND" ? "text-slate-300" : "text-slate-400"}`}>{new Date(message.sent_at ?? message.created_at).toLocaleString()} · {message.delivery_status.toLowerCase()}</p>{message.error_message && <p className="mt-1 text-xs text-red-300">{message.error_message}</p>}</div></div>)}
            {!messages.length && <p className="py-12 text-center text-sm text-slate-500">No messages yet.</p>}
          </div>
          <MessageComposer conversationId={conversation.id} />
        </section>
        <aside className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-950"><div className="flex items-center gap-2"><UserRound className="size-4 text-champagne-700" /><h2 className="font-semibold">Customer</h2></div><p className="mt-3 font-medium">{conversation.clients?.name ?? "New guest"}</p><p className="mt-1 text-sm text-slate-500">{conversation.identity?.username ? `@${conversation.identity.username.replace(/^@/, "")}` : conversation.identity?.phone ?? conversation.clients?.phone}</p><p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{conversation.clients?.vip_level ?? "STANDARD"}</p><Button asChild variant="secondary" size="sm" className="mt-3 w-full"><Link href={`/clients/${conversation.client_id}`}>Open CRM profile</Link></Button></div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-950"><h2 className="font-semibold">Workflow</h2>{profile.role !== "PROMOTER" && <form action={assignConversation} className="mt-3 space-y-2"><input type="hidden" name="conversationId" value={conversation.id} /><label className="text-xs font-medium text-slate-500" htmlFor="promoterId">Promoter</label><select id="promoterId" name="promoterId" defaultValue={conversation.assigned_promoter_id ?? ""} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="">Unassigned</option>{promoters.map((promoter) => <option key={promoter.id} value={promoter.id}>{promoter.name ?? promoter.email}</option>)}</select><Button type="submit" size="sm" className="w-full">Save assignment</Button></form>}<form action={updateConversationStatus} className="mt-3 flex gap-2"><input type="hidden" name="conversationId" value={conversation.id} /><select name="status" defaultValue={conversation.status} className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="OPEN">Open</option><option value="PENDING">Pending</option><option value="RESOLVED">Resolved</option></select><Button type="submit" size="sm" variant="secondary">Update</Button></form></div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-slate-950"><div className="flex items-center gap-2"><LockKeyhole className="size-4 text-amber-700" /><h2 className="font-semibold">Internal notes</h2></div><p className="mt-1 text-xs text-amber-800">Private to staff. These never go to Meta or the customer.</p><div className="mt-3 space-y-2">{notes.map((note) => <div key={note.id} className="rounded-md bg-white p-2.5 text-sm"><p>{note.body}</p><p className="mt-1 text-[10px] text-slate-400">{note.author?.name ?? "Staff"} · {new Date(note.created_at).toLocaleString()}</p></div>)}</div><form action={addConversationNote} className="mt-3 space-y-2"><input type="hidden" name="conversationId" value={conversation.id} /><Textarea name="body" required maxLength={4000} rows={3} placeholder="Add a private note…" className="bg-white" /><Button type="submit" size="sm" variant="secondary" className="w-full">Add internal note</Button></form></div>
        </aside>
      </div>
    </AppShell>
  );
}
