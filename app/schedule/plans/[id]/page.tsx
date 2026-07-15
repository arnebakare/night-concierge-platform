import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SchedulePlanView } from "@/components/schedule/schedule-plan-view";
import { requireProfile } from "@/lib/auth";
import { getClientsForProfile, getSchedulePlanDetail } from "@/lib/data/app";

export default async function SchedulePlanDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const [profile, { id }] = await Promise.all([requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]), params]);
  const [plan, clients] = await Promise.all([getSchedulePlanDetail(id), getClientsForProfile(profile)]);
  if (!plan) notFound();

  return (
    <AppShell profile={profile} title="Schedule trail" eyebrow="Customer message">
      <SchedulePlanView plan={plan} clients={clients} />
    </AppShell>
  );
}
