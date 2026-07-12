"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/lib/actions/account-actions";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function submit() {
    if (password.length < 8 || password !== confirm) { setMessage("Passwords must match and contain at least 8 characters."); return; }
    startTransition(async () => {
      const result = await updatePassword(password);
      if (!result.ok) setMessage(result.message); else window.location.href = "/profile";
    });
  }
  return <div className="space-y-4"><div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" /></div>{message && <p className="rounded-md bg-secondary p-3 text-sm text-muted-foreground">{message}</p>}<Button type="button" className="w-full" size="lg" disabled={pending} onClick={submit}>{pending ? "Updating" : "Update password"}</Button></div>;
}
