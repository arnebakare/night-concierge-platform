"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Check, ChevronLeft, Crown, MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { createPublicRequest } from "@/lib/actions/request-actions";
import { publicRequestSchema, type PublicRequestInput } from "@/lib/validation/request";
import type { Club } from "@/lib/types";
import { cn, formatEnum } from "@/lib/utils";

const types = [
  ["GUESTLIST", "Guestlist", Users],
  ["TABLE", "Table", Crown],
  ["VIP_SERVICE", "VIP Service", MessageCircle],
  ["GENERAL", "General", Calendar]
] as const;

const featuredVenueSlugs = ["le-jade", "la-plage-casanis", "mamzel"];

export function RequestFormSteps({
  clubs,
  promoterSlug,
  magicToken,
  defaults
}: Readonly<{
  clubs: Club[];
  promoterSlug?: string;
  magicToken?: string;
  defaults?: Partial<PublicRequestInput>;
}>) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showAllVenues, setShowAllVenues] = useState(false);
  const [pending, startTransition] = useTransition();
  const orderedClubs = useMemo(() => {
    const featured = featuredVenueSlugs
      .map((slug) => clubs.find((club) => club.slug === slug))
      .filter((club): club is Club => Boolean(club));
    const remaining = clubs.filter((club) => !featuredVenueSlugs.includes(club.slug));
    return [...featured, ...remaining];
  }, [clubs]);
  const visibleClubs = showAllVenues ? orderedClubs : orderedClubs.slice(0, 3);
  const hasMoreVenues = orderedClubs.length > visibleClubs.length;
  const form = useForm<PublicRequestInput>({
    resolver: zodResolver(publicRequestSchema),
    defaultValues: {
      clubId: defaults?.clubId ?? orderedClubs[0]?.id ?? "",
      requestType: defaults?.requestType ?? "GUESTLIST",
      name: defaults?.name ?? "",
      phone: defaults?.phone ?? "",
      email: defaults?.email ?? "",
      instagram: defaults?.instagram ?? "",
      requestedDate: defaults?.requestedDate ?? new Date().toISOString().slice(0, 10),
      arrivalTime: defaults?.arrivalTime ?? "",
      guestCount: defaults?.guestCount ?? 2,
      budget: defaults?.budget ?? "",
      message: defaults?.message ?? "",
      promoterSlug,
      magicToken
    }
  });

  const values = form.watch();
  const selectedClub = useMemo(() => clubs.find((club) => club.id === values.clubId), [clubs, values.clubId]);

  async function next() {
    const fieldsByStep: Record<number, (keyof PublicRequestInput)[]> = {
      1: ["clubId"], 2: ["requestType"], 3: ["name", "phone", "email", "instagram"], 4: ["requestedDate", "guestCount", "arrivalTime", "budget", "message"]
    };
    const valid = await form.trigger(fieldsByStep[step]);
    if (valid) { setError(null); setStep((current) => Math.min(current + 1, 5)); }
    else setError("Please check the highlighted details before continuing.");
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const valid = await form.trigger();
      if (!valid) {
        setError("A few details need attention before we can send this.");
        return;
      }
      const result = await createPublicRequest(form.getValues());
      if (!result.ok) setError(result.message ?? "Request could not be sent.");
    });
  }

  return (
    <LuxuryCard className="space-y-5">
      {!clubs.length && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-red-100">Requests are temporarily unavailable because no active clubs are configured.</div>}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Step {step} of 5</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((item) => (
            <span key={item} className={cn("h-1.5 w-7 rounded-full bg-secondary", item <= step && "bg-champagne-300")} />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <h2 className="font-serif text-2xl">Choose your club</h2>
          <div className="grid gap-3">
            {visibleClubs.map((club) => (
              <button
                key={club.id}
                type="button"
                onClick={() => form.setValue("clubId", club.id)}
                className={cn(
                  "min-h-20 rounded-lg border bg-ink-700 p-4 text-left transition",
                  values.clubId === club.id ? "border-champagne-300 shadow-glow" : "border-champagne-700/40"
                )}
              >
                <span className="block text-lg font-semibold">{club.name}</span>
                <span className="text-sm text-muted-foreground">{club.city}</span>
              </button>
            ))}
          </div>
          {hasMoreVenues && (
            <Button type="button" variant="secondary" className="w-full" onClick={() => setShowAllVenues(true)}>
              Show more venues
            </Button>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h2 className="font-serif text-2xl">What do you need?</h2>
          <div className="grid grid-cols-2 gap-3">
            {types.map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => form.setValue("requestType", value)}
                className={cn(
                  "flex min-h-28 flex-col justify-between rounded-lg border bg-ink-700 p-4 text-left transition",
                  values.requestType === value ? "border-champagne-300 shadow-glow" : "border-champagne-700/40"
                )}
              >
                <Icon className="size-6 text-champagne-300" />
                <span className="font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-serif text-2xl">Guest details</h2>
          <Field label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="Full name" />
          </Field>
          <Field label="Phone / WhatsApp" error={form.formState.errors.phone?.message}>
            <Input {...form.register("phone")} placeholder="+34 600 000 000" inputMode="tel" />
          </Field>
          <Field label="Email optional" error={form.formState.errors.email?.message}>
            <Input {...form.register("email")} placeholder="name@email.com" inputMode="email" />
          </Field>
          <Field label="Instagram optional">
            <Input {...form.register("instagram")} placeholder="@handle" />
          </Field>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="font-serif text-2xl">Night details</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" error={form.formState.errors.requestedDate?.message}>
              <Input {...form.register("requestedDate")} type="date" min={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field label="Guests" error={form.formState.errors.guestCount?.message}>
              <Input {...form.register("guestCount")} type="number" min={1} inputMode="numeric" />
            </Field>
          </div>
          <Field label="Arrival time optional">
            <Input {...form.register("arrivalTime")} placeholder="Around 01:00" />
          </Field>
          <Field label="Budget optional">
            <Input {...form.register("budget")} placeholder="Bottle service, 1k, flexible..." />
          </Field>
          <Field label="Message optional">
            <Textarea {...form.register("message")} placeholder="Occasion, preferences, special requests..." />
          </Field>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <h2 className="font-serif text-2xl">Confirm request</h2>
          <div className="rounded-lg border border-champagne-700/40 bg-ink-800 p-4 text-sm">
            <p className="text-lg font-semibold">{selectedClub?.name}</p>
            <p className="text-muted-foreground">{formatEnum(values.requestType)} · {values.requestedDate} · {values.guestCount} guests</p>
            <p className="mt-3">{values.name}</p>
            <p className="text-muted-foreground">{values.phone}</p>
          </div>
        </div>
      )}

      {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-red-100">{error}</p>}

      <div className="flex gap-3">
        {step > 1 && (
          <Button type="button" variant="secondary" size="lg" onClick={() => setStep((current) => current - 1)}>
            <ChevronLeft className="size-5" />
          </Button>
        )}
        {step < 5 ? (
          <Button type="button" className="flex-1" size="lg" onClick={next} disabled={!clubs.length}>
            Continue
          </Button>
        ) : (
          <Button type="button" className="flex-1" size="lg" onClick={submit} disabled={pending}>
            <Check className="size-5" />
            {pending ? "Sending" : "Send request"}
          </Button>
        )}
      </div>
    </LuxuryCard>
  );
}

function Field({ label, error, children }: Readonly<{ label: string; error?: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-red-200">{error}</p>}
    </div>
  );
}
