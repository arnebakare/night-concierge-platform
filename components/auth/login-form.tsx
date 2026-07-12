"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasSupabaseBrowserEnv } from "@/lib/env";
import { sendLoginMagicLink, sendPasswordRecovery, signInWithPassword } from "@/lib/actions/account-actions";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !hasSupabaseBrowserEnv();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function signIn() {
    setMessage(null);
    startTransition(async () => {
      const result = await signInWithPassword({ email, password });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      window.location.href = next === "/dashboard" ? result.home : next;
    });
  }

  function magicLink() {
    setMessage(null);
    startTransition(async () => {
      const result = await sendLoginMagicLink(email, next);
      setMessage(result.message);
    });
  }

  function resetPassword() {
    setMessage(null);
    startTransition(async () => {
      const result = await sendPasswordRecovery(email);
      setMessage(result.message);
    });
  }

  if (demoMode) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-champagne-700/40 bg-secondary p-3 text-sm text-muted-foreground">
          Local demo mode is active because Supabase browser credentials are not configured.
        </p>
        <div className="grid gap-3">
          <Button type="button" size="lg" onClick={() => (window.location.href = "/dashboard")}>
            Open promoter dashboard
          </Button>
          <Button type="button" size="lg" variant="secondary" onClick={() => (window.location.href = "/manager")}>
            Open manager dashboard
          </Button>
          <Button type="button" size="lg" variant="secondary" onClick={() => (window.location.href = "/admin")}>
            Open admin dashboard
          </Button>
          <Button type="button" size="lg" variant="secondary" onClick={() => (window.location.href = "/client")}>
            Open client dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="promoter@club.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
      </div>
      {message && <p className="rounded-md border border-champagne-700/40 bg-secondary p-3 text-sm text-muted-foreground">{message}</p>}
      <Button className="w-full" size="lg" type="button" onClick={signIn} disabled={pending}>
        Sign in
      </Button>
      <Button className="w-full" size="lg" variant="secondary" type="button" onClick={magicLink} disabled={pending || !email}>
        Send magic link
      </Button>
      <Button className="w-full" variant="ghost" type="button" onClick={resetPassword} disabled={pending || !email}>Forgot password</Button>
    </form>
  );
}
