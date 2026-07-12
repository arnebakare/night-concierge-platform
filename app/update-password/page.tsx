import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { LuxuryCard } from "@/components/ui/luxury-card";

export default function UpdatePasswordPage() {
  return <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10"><div className="mb-6"><p className="text-xs uppercase tracking-[0.28em] text-champagne-300">Account recovery</p><h1 className="mt-3 font-serif text-4xl">Choose a new password</h1></div><LuxuryCard><UpdatePasswordForm /></LuxuryCard></main>;
}
