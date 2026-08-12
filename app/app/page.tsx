import { redirect } from "next/navigation";
import { getCurrentProfile, roleHome } from "@/lib/auth";

export default async function AppLaunchPage() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login?next=/app");
  redirect(roleHome(profile.role));
}
