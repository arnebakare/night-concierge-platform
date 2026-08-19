import type { ConciergeRequest, RequestStatus } from "@/lib/types";
import { formatEnum } from "@/lib/utils";
import { isTemporaryPhone } from "@/lib/sales/funnel";

const archivedStatuses: RequestStatus[] = ["ARRIVED", "NO_SHOW", "DECLINED", "CANCELLED"];

export function requestServiceLabel(request: Pick<ConciergeRequest, "message" | "request_type">) {
  return request.message?.match(/^Selected service:\s*(.+)$/m)?.[1] ?? formatEnum(request.request_type);
}

export function isArchivedRequest(status: RequestStatus) {
  return archivedStatuses.includes(status);
}

export function isMissingRequestContact(request: Pick<ConciergeRequest, "clients">) {
  return !request.clients?.phone || isTemporaryPhone(request.clients.phone);
}

export function requestDateLabel(value: string) {
  const today = dateString(0);
  if (value === today) return "Today";
  if (value === dateString(1)) return "Tomorrow";
  return compactDate(value);
}

export function compactDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}

export function fullDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}

export function requestFreshnessLabel(createdAt: string) {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 2) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function requestPriority(request: ConciergeRequest) {
  if (isMissingRequestContact(request)) return { label: "Needs contact", tone: "warning" as const };
  if (request.status === "NEW") return { label: "Reply now", tone: "hot" as const };
  if (request.status === "PENDING") return { label: "Venue check", tone: "warning" as const };
  if (request.status === "CONFIRMED") return { label: "Ready", tone: "success" as const };
  if (isArchivedRequest(request.status)) return { label: "Archived", tone: "muted" as const };
  return { label: "Follow up", tone: "neutral" as const };
}

export function requestValueSignal(request: ConciergeRequest) {
  const parts = [request.budget, request.message, request.internal_summary].filter(Boolean).join(" ").toLowerCase();
  if (/\b(2k|3k|4k|5k|vip|premium|best table|front|minimum spend|bottle)\b/.test(parts)) return "High intent";
  if (request.guest_count >= 8) return "Large group";
  return "";
}

export function whatsappContactHref(phone?: string | null, message?: string) {
  if (!phone || isTemporaryPhone(phone)) return "#";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "#";
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

function dateString(offset: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}
