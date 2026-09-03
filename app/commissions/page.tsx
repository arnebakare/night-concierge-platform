import { redirect } from "next/navigation";
import { getCurrentProfile, roleHome } from "@/lib/auth";

export default async function CommissionsAliasPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/commissions");
  if (profile.role === "PROMOTER_MANAGER") redirect("/manager/commissions");
  if (profile.role === "SUPER_ADMIN") redirect("/admin/commissions");
  redirect(roleHome(profile.role));
}
