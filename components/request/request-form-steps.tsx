"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Check, ChevronLeft, Clock, MapPin, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { createPublicRequest } from "@/lib/actions/request-actions";
import { publicRequestSchema, type PublicRequestInput } from "@/lib/validation/request";
import type { Club, ConciergeEvent } from "@/lib/types";
import { cn, formatEnum } from "@/lib/utils";
import { getClubVenueExperience } from "@/components/request/venue-experience";

const featuredVenueSlugs = ["le-jade", "la-plage-casanis", "mamzel"];

export function RequestFormSteps({
  clubs,
  events = [],
  promoterSlug,
  magicToken,
  defaults
}: Readonly<{
  clubs: Club[];
  events?: ConciergeEvent[];
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
  const initialClub = orderedClubs[0];
  const initialService = initialClub ? getClubVenueExperience(initialClub).services[0] : undefined;
  const form = useForm<PublicRequestInput>({
    resolver: zodResolver(publicRequestSchema),
    defaultValues: {
      clubId: defaults?.clubId ?? orderedClubs[0]?.id ?? "",
      requestType: defaults?.requestType ?? initialService?.requestType ?? "GUESTLIST",
      serviceLabel: defaults?.serviceLabel ?? initialService?.label ?? "",
      name: defaults?.name ?? "",
      phone: defaults?.phone ?? "",
      email: defaults?.email ?? "",
      instagram: defaults?.instagram ?? "",
      requestedDate: defaults?.requestedDate ?? new Date().toISOString().slice(0, 10),
      arrivalTime: defaults?.arrivalTime ?? "",
      guestCount: defaults?.guestCount ?? 2,
      budget: defaults?.budget ?? "",
      message: defaults?.message ?? "",
      occasionId: defaults?.occasionId ?? "",
      occasionName: defaults?.occasionName ?? "",
      occasionDate: defaults?.occasionDate ?? "",
      promoterSlug,
      magicToken
    }
  });

  const values = form.watch();
  const selectedClub = useMemo(() => clubs.find((club) => club.id === values.clubId), [clubs, values.clubId]);
  const selectedExperience = useMemo(() => getClubVenueExperience(selectedClub), [selectedClub]);
  const selectedClubEvents = useMemo(
    () => events.filter((event) => event.club_id === values.clubId).slice(0, 5),
    [events, values.clubId]
  );
  const selectedOccasion = useMemo(
    () => selectedClubEvents.find((event) => event.id === values.occasionId),
    [selectedClubEvents, values.occasionId]
  );
  const stepTitles = ["Venue", "Experience", "Guest", "Details", "Review"];

  useEffect(() => {
    const serviceExists = selectedExperience.services.some((service) => service.label === values.serviceLabel && service.requestType === values.requestType);
    if (serviceExists || !selectedExperience.services[0]) return;
    form.setValue("serviceLabel", selectedExperience.services[0].label);
    form.setValue("requestType", selectedExperience.services[0].requestType);
  }, [form, selectedExperience, values.requestType, values.serviceLabel]);

  useEffect(() => {
    if (!values.occasionId) return;
    if (selectedClubEvents.some((event) => event.id === values.occasionId)) return;
    selectOccasion(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClubEvents, values.occasionId]);

  function selectClub(club: Club) {
    const experience = getClubVenueExperience(club);
    const service = experience.services[0];
    form.setValue("clubId", club.id, { shouldValidate: true });
    if (service) {
      form.setValue("serviceLabel", service.label, { shouldValidate: true });
      form.setValue("requestType", service.requestType, { shouldValidate: true });
    }
  }

  function selectOccasion(event: ConciergeEvent | null) {
    form.setValue("occasionId", event?.id ?? "", { shouldValidate: true });
    form.setValue("occasionName", event?.name ?? "", { shouldValidate: true });
    form.setValue("occasionDate", event?.event_date ?? "", { shouldValidate: true });
    if (event) form.setValue("requestedDate", event.event_date, { shouldValidate: true });
  }

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
    <LuxuryCard className="space-y-5 border-champagne-300/35 bg-ink-900/82 shadow-[0_24px_90px_rgba(0,0,0,0.48)]">
      {!clubs.length && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-red-100">Requests are temporarily unavailable because no active clubs are configured.</div>}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.22em] text-champagne-300">{stepTitles[step - 1]}</p>
          <p className="text-sm text-muted-foreground">{step}/5</p>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {[1, 2, 3, 4, 5].map((item) => (
            <span key={item} className={cn("h-1.5 rounded-full bg-secondary transition", item <= step && "bg-champagne-300 shadow-glow")} />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <div className="rounded-lg border border-champagne-700/30 bg-gradient-to-br from-champagne-300/10 to-transparent p-4">
            <h2 className="font-serif text-2xl">Choose your venue</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Start with the place. We’ll shape the request around that venue’s rhythm.</p>
          </div>
          <div className="grid gap-3">
            {visibleClubs.map((club) => {
              const experience = getClubVenueExperience(club);
              return (
              <button
                key={club.id}
                type="button"
                onClick={() => selectClub(club)}
                className={cn(
                  "group relative flex min-h-28 items-center gap-4 overflow-hidden rounded-lg border bg-ink-700/90 p-4 text-left transition active:scale-[0.99]",
                  values.clubId === club.id ? "border-champagne-300 bg-champagne-300/10 shadow-glow" : "border-champagne-700/40 hover:border-champagne-300/60"
                )}
              >
                <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-champagne-300/70 opacity-0 transition group-hover:opacity-70" />
                <VenueLogo club={club} monogram={experience.monogram} size="lg" />
                <span className="min-w-0">
                  <span className="block font-serif text-xl leading-tight">{experience.wordmark}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{experience.tagline}</span>
                  <span className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-champagne-700/40 px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-champagne-300">
                      <MapPin className="size-3" /> {club.city}
                    </span>
                    <span className="inline-flex rounded-full border border-champagne-700/30 px-2 py-0.5 text-[11px] text-muted-foreground">{experience.mood}</span>
                  </span>
                </span>
              </button>
              );
            })}
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
          <div className="rounded-lg border border-champagne-700/40 bg-[radial-gradient(circle_at_top_right,rgba(216,183,100,0.16),transparent_34%),rgba(17,17,19,0.94)] p-4">
            <div className="flex items-center gap-3">
              <VenueLogo club={selectedClub} monogram={selectedExperience.monogram} size="xl" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-champagne-300">{selectedExperience.mood}</p>
                <h2 className="font-serif text-2xl">{selectedExperience.wordmark}</h2>
                <p className="text-sm text-muted-foreground">{selectedExperience.tagline}</p>
              </div>
            </div>
          </div>
          <h3 className="font-serif text-2xl">What should we arrange?</h3>
          <div className="grid grid-cols-2 gap-3">
            {selectedExperience.services.map((service) => {
              const Icon = service.icon;
              const active = values.serviceLabel === service.label && values.requestType === service.requestType;
              return (
              <button
                key={service.id}
                type="button"
                onClick={() => {
                  form.setValue("requestType", service.requestType, { shouldValidate: true });
                  form.setValue("serviceLabel", service.label, { shouldValidate: true });
                }}
                className={cn(
                  "group flex min-h-32 flex-col justify-between rounded-lg border bg-ink-700 p-4 text-left transition active:scale-[0.99]",
                  active ? "border-champagne-300 bg-champagne-300/10 shadow-glow" : "border-champagne-700/40 hover:border-champagne-300/60"
                )}
              >
                <span className="flex size-10 items-center justify-center rounded-md bg-ink-900/70 text-champagne-300">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold">{service.label}</span>
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">{service.description}</span>
                </span>
              </button>
              );
            })}
          </div>
          {selectedClubEvents.length > 0 && (
            <div className="rounded-lg border border-champagne-700/40 bg-ink-950/50 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-champagne-300">Occasions</p>
                  <p className="mt-1 text-sm text-muted-foreground">Optional. Pick one to request that date.</p>
                </div>
                {values.occasionId && (
                  <button type="button" className="text-xs font-semibold text-champagne-200" onClick={() => selectOccasion(null)}>
                    Clear
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {selectedClubEvents.map((event) => {
                  const active = values.occasionId === event.id;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => selectOccasion(event)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-md border p-3 text-left transition",
                        active ? "border-champagne-300 bg-champagne-500/10" : "border-champagne-700/30 bg-ink-800/70"
                      )}
                    >
                      <CalendarDays className="mt-0.5 size-5 shrink-0 text-champagne-300" />
                      <span className="min-w-0">
                        <span className="block font-semibold leading-tight">{event.name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{formatEventDate(event.event_date)}{event.description ? ` · ${event.description}` : ""}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-champagne-700/30 bg-secondary/50 p-4">
            <h2 className="font-serif text-2xl">Who should we contact?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Just the essentials. WhatsApp is best for fast confirmation.</p>
          </div>
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
          <div className="rounded-lg border border-champagne-700/30 bg-secondary/50 p-4">
            <h2 className="font-serif text-2xl">When are you going?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Approximate times are fine. We’ll confirm the details with you.</p>
          </div>
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
          <div className="rounded-lg border border-champagne-700/30 bg-gradient-to-br from-champagne-300/10 to-transparent p-4">
            <h2 className="font-serif text-2xl">Ready to send</h2>
            <p className="mt-1 text-sm text-muted-foreground">We’ll send this to the team and come back with the next step.</p>
          </div>
          <div className="rounded-lg border border-champagne-700/40 bg-ink-800 p-4 text-sm shadow-panel">
            <div className="mb-3 flex items-center gap-3">
              <VenueLogo club={selectedClub} monogram={selectedExperience.monogram} size="md" />
              <div>
                <p className="text-lg font-semibold">{selectedExperience.wordmark}</p>
                <p className="text-muted-foreground">{values.serviceLabel || formatEnum(values.requestType)}</p>
                {selectedOccasion && <p className="text-champagne-300">{selectedOccasion.name} · {formatEventDate(selectedOccasion.event_date)}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <ReviewFact icon={CalendarDays} label="Date" value={values.requestedDate} />
              <ReviewFact icon={Users} label="Guests" value={String(values.guestCount)} />
              <ReviewFact icon={Clock} label="Arrival" value={values.arrivalTime || "TBC"} />
            </div>
            <div className="mt-3 rounded-md bg-secondary/70 p-3">
              <p className="font-semibold">{values.name}</p>
              <p className="text-muted-foreground">{values.phone}</p>
            </div>
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

function VenueLogo({ club, monogram, size = "md" }: Readonly<{ club?: Club | null; monogram: string; size?: "md" | "lg" | "xl" }>) {
  const sizeClass = size === "xl" ? "size-16" : size === "lg" ? "size-14" : "size-12";

  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-champagne-500/50 bg-ink-950/80 font-serif text-champagne-100", sizeClass)}>
      {club?.image_url ? (
        <img src={club.image_url} alt={`${club.name} logo`} className="h-full w-full object-contain p-1" />
      ) : (
        <span className={cn(size === "xl" ? "text-xl" : "text-lg")}>{monogram}</span>
      )}
    </span>
  );
}

function ReviewFact({
  icon: Icon,
  label,
  value
}: Readonly<{ icon: typeof CalendarDays; label: string; value: string }>) {
  return (
    <div className="rounded-md bg-ink-900/70 p-2">
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Icon className="size-3.5 text-champagne-300" />{label}</p>
      <p className="mt-1 truncate font-semibold">{value}</p>
    </div>
  );
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
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
