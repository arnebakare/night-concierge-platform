"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, CalendarRange, Car, Check, ChevronLeft, Clock, Flag, Hotel, MapPin, Minus, Moon, Package, Plus, ShieldCheck, ShipWheel, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPublicRequest } from "@/lib/actions/request-actions";
import { publicRequestSchema, type PublicRequestInput } from "@/lib/validation/request";
import type { Club, ConciergeEvent } from "@/lib/types";
import { cn, formatEnum } from "@/lib/utils";
import { getClubVenueExperience } from "@/components/request/venue-experience";

const featuredVenueSlugs = ["le-jade", "la-plage-casanis", "mamzel"];
const conciergeRequestTypes = ["BOAT", "GOLF", "VILLA", "TRANSFER", "SCHEDULE", "PACKAGE"] as const;
export type RequestCategory = "nightlife" | "boat" | "golf" | "villa" | "transfer" | "schedule" | "package";

const categoryCards: { id: RequestCategory; title: string; description: string; requestType?: typeof conciergeRequestTypes[number]; icon: typeof Moon }[] = [
  { id: "nightlife", title: "Nightlife", description: "Beach clubs, restaurants, guestlists, VIP tables, and DJs.", icon: Moon },
  { id: "boat", title: "Boats & yachts", description: "Private boats, yachts, routes, skipper, and onboard requests.", requestType: "BOAT", icon: ShipWheel },
  { id: "golf", title: "Golf", description: "Tee times, courses, buggies, club rental, and lunch after.", requestType: "GOLF", icon: Flag },
  { id: "villa", title: "Hotels & villas", description: "Suites, private villas, hosted stays, chefs, and special needs.", requestType: "VILLA", icon: Hotel },
  { id: "transfer", title: "Transfers", description: "Airport pickup, chauffeurs, drivers by the hour, and night movement.", requestType: "TRANSFER", icon: Car },
  { id: "schedule", title: "Full schedule", description: "A complete Marbella trail across days, venues, DJs, and movement.", requestType: "SCHEDULE", icon: CalendarRange },
  { id: "package", title: "Packages", description: "Ready-made or tailored stay packages for your group.", requestType: "PACKAGE", icon: Package }
];

export function RequestFormSteps({
  clubs,
  events = [],
  promoterSlug,
  magicToken,
  initialCategory,
  startAtStep,
  defaults
}: Readonly<{
  clubs: Club[];
  events?: ConciergeEvent[];
  promoterSlug?: string;
  magicToken?: string;
  initialCategory?: RequestCategory;
  startAtStep?: number;
  defaults?: Partial<PublicRequestInput>;
}>) {
  const [step, setStep] = useState(Math.min(6, Math.max(1, startAtStep ?? (initialCategory ? 2 : 1))));
  const [category, setCategory] = useState<RequestCategory | null>(initialCategory ?? inferInitialCategory(defaults?.requestType));
  const flowRef = useRef<HTMLElement | null>(null);
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
  const conciergeClub = useMemo(() => orderedClubs.find((club) => club.slug === "marbella-concierge"), [orderedClubs]);
  const nightlifeClubs = useMemo(() => orderedClubs.filter((club) => club.slug !== "marbella-concierge"), [orderedClubs]);
  const venueChoices = category === "nightlife" || !category ? nightlifeClubs : conciergeClub ? [conciergeClub] : orderedClubs;
  const visibleClubs = showAllVenues ? venueChoices : venueChoices.slice(0, 3);
  const hasMoreVenues = venueChoices.length > visibleClubs.length;
  const initialClub = (defaults?.clubId ? orderedClubs.find((club) => club.id === defaults.clubId) : category && category !== "nightlife" ? conciergeClub : orderedClubs[0]) ?? orderedClubs[0];
  const initialCategoryCard = categoryCards.find((item) => item.id === category);
  const initialServices = initialClub ? getClubVenueExperience(initialClub).services : [];
  const initialService = defaults?.requestType
    ? initialServices.find((service) => service.requestType === defaults.requestType) ?? initialServices[0]
    : initialCategoryCard?.requestType
      ? initialServices.find((service) => service.requestType === initialCategoryCard.requestType) ?? initialServices[0]
      : initialServices[0];
  const form = useForm<PublicRequestInput>({
    resolver: zodResolver(publicRequestSchema),
    defaultValues: {
      clubId: defaults?.clubId ?? initialClub?.id ?? "",
      requestType: defaults?.requestType ?? initialService?.requestType ?? "GUESTLIST",
      serviceLabel: defaults?.serviceLabel ?? initialService?.label ?? "",
      name: defaults?.name ?? "",
      phone: defaults?.phone ?? "",
      email: defaults?.email ?? "",
      instagram: defaults?.instagram ?? "",
      requestedDate: defaults?.requestedDate ?? new Date().toISOString().slice(0, 10),
      requestedDateEnd: defaults?.requestedDateEnd ?? "",
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
    () => events.filter((event) => event.club_id === values.clubId).slice(0, 3),
    [events, values.clubId]
  );
  const selectedOccasion = useMemo(
    () => selectedClubEvents.find((event) => event.id === values.occasionId),
    [selectedClubEvents, values.occasionId]
  );
  const isMultiDayRequest = ["VILLA", "SCHEDULE", "PACKAGE"].includes(values.requestType);
  const stepTitles = ["Request", "Venue", "Experience", "Guest", "Details", "Review"];
  const nextLabel = step === 1 ? "Choose place" : step === 2 ? "Choose experience" : step === 3 ? "Add contact" : step === 4 ? "Add details" : "Review request";

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

  useEffect(() => {
    flowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  function selectClub(club: Club) {
    const experience = getClubVenueExperience(club);
    const service = experience.services[0];
    form.setValue("clubId", club.id, { shouldValidate: true });
    if (service) {
      form.setValue("serviceLabel", service.label, { shouldValidate: true });
      form.setValue("requestType", service.requestType, { shouldValidate: true });
    }
  }

  function selectCategory(nextCategory: RequestCategory) {
    setCategory(nextCategory);
    setShowAllVenues(false);
    const option = categoryCards.find((item) => item.id === nextCategory);
    const nextClub = option?.requestType ? conciergeClub : nightlifeClubs[0] ?? orderedClubs[0];
    if (nextClub) {
      selectClub(nextClub);
      if (option?.requestType) selectServiceByType(nextClub, option.requestType);
    }
    setStep(option?.requestType ? 3 : 2);
  }

  function selectServiceByType(club: Club, requestType: typeof conciergeRequestTypes[number]) {
    const service = getClubVenueExperience(club).services.find((item) => item.requestType === requestType);
    if (!service) return;
    form.setValue("requestType", service.requestType, { shouldValidate: true });
    form.setValue("serviceLabel", service.label, { shouldValidate: true });
  }

  function selectOccasion(event: ConciergeEvent | null) {
    form.setValue("occasionId", event?.id ?? "", { shouldValidate: true });
    form.setValue("occasionName", event?.name ?? "", { shouldValidate: true });
    form.setValue("occasionDate", event?.event_date ?? "", { shouldValidate: true });
    if (event) form.setValue("requestedDate", event.event_date, { shouldValidate: true });
  }

  function setGuestCount(nextValue: number) {
    form.setValue("guestCount", Math.max(1, Math.min(200, nextValue)), { shouldValidate: true });
  }

  async function next() {
    const fieldsByStep: Record<number, (keyof PublicRequestInput)[]> = {
      2: ["clubId"], 3: ["requestType"], 4: ["name", "phone", "email", "instagram"], 5: ["requestedDate", "requestedDateEnd", "guestCount", "arrivalTime", "budget", "message"]
    };
    if (step === 1 && !category) {
      setError("Choose what you need first.");
      return;
    }
    const valid = await form.trigger(fieldsByStep[step]);
    if (valid) { setError(null); setStep((current) => Math.min(current + 1, 6)); }
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
    <section ref={flowRef} className="request-flow-card overflow-hidden rounded-[1.35rem] border border-champagne-300/24 bg-ink-950/76 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
      {!clubs.length && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-red-100">Requests are temporarily unavailable because no active clubs are configured.</div>}
      <div className="space-y-3 border-b border-champagne-700/24 bg-ink-950/50 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.22em] text-champagne-300">{stepTitles[step - 1]}</p>
          <p className="text-sm font-medium text-champagne-100">{step}/6</p>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <span key={item} className={cn("h-1.5 rounded-full bg-secondary transition", item <= step && "bg-champagne-300 shadow-glow")} />
          ))}
        </div>
        {selectedClub && step > 2 && (
          <button type="button" onClick={() => setStep(2)} className="flex w-full items-center gap-3 rounded-xl border border-champagne-700/28 bg-white/[0.045] p-2.5 text-left transition hover:border-champagne-300/55">
            <VenueLogo club={selectedClub} monogram={selectedExperience.monogram} size="md" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-champagne-50">{selectedExperience.wordmark}</span>
              <span className="block truncate text-xs text-muted-foreground">{values.serviceLabel || "Choose service"}</span>
            </span>
            <span className="ml-auto text-xs font-semibold text-champagne-300">Change</span>
          </button>
        )}
      </div>

      <div className="space-y-5 px-4 py-4 pb-24">

      {step === 1 && (
        <div className="space-y-3">
          <StepIntro title="What do you need?" description="Start with the service. We will only show the choices that fit." />
          <div className="grid gap-2">
            {categoryCards.map((item) => {
              const Icon = item.icon;
              const active = category === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectCategory(item.id)}
                  className={cn(
                    "group flex min-h-[4.65rem] items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99]",
                    active ? "border-champagne-300 bg-champagne-300/14 shadow-glow" : "border-champagne-700/28 bg-ink-950/48 hover:border-champagne-300/55"
                  )}
                >
                  <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.055] text-champagne-300", active && "bg-champagne-300 text-ink-950")}>
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-champagne-50">{item.title}</span>
                    <span className="mt-1 block text-[13px] leading-snug text-champagne-100/72">{item.description}</span>
                  </span>
                  {active && <Check className="ml-auto size-4 shrink-0 text-champagne-300" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <StepIntro title="Where are you going?" description={category === "nightlife" ? "Choose the venue. Services adapt to each place." : "This service is handled through Marbella Concierge."} />
          <div className="grid gap-3">
            {visibleClubs.map((club) => {
              const experience = getClubVenueExperience(club);
              return (
              <button
                key={club.id}
                type="button"
                onClick={() => selectClub(club)}
                className={cn(
                  "group relative flex min-h-[5.7rem] items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left transition active:scale-[0.99]",
                  values.clubId === club.id ? "border-champagne-300 bg-champagne-300/14 shadow-glow" : "border-champagne-700/28 bg-ink-950/48 hover:border-champagne-300/55"
                )}
              >
                <span className={cn("absolute inset-y-3 left-0 w-1 rounded-r-full bg-champagne-300/70 opacity-0 transition", values.clubId === club.id && "opacity-100")} />
                <VenueLogo club={club} monogram={experience.monogram} size="lg" />
                <span className="min-w-0">
                  <span className="block font-serif text-[1.18rem] leading-tight text-champagne-50">{experience.wordmark}</span>
                  <span className="mt-1 block line-clamp-1 text-[13px] text-champagne-100/76">{experience.tagline}</span>
                  <span className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-champagne-700/35 px-2 py-0.5 text-[10px] uppercase tracking-[0.13em] text-champagne-300">
                      <MapPin className="size-3" /> {club.city}
                    </span>
                    <span className="inline-flex rounded-full border border-champagne-700/25 px-2 py-0.5 text-[10px] text-muted-foreground">{experience.mood}</span>
                  </span>
                </span>
                {values.clubId === club.id && (
                  <span className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-full bg-champagne-300 text-ink-950 shadow-glow">
                    <Check className="size-4" />
                  </span>
                )}
              </button>
              );
            })}
          </div>
          {hasMoreVenues && (
            <Button type="button" variant="secondary" className="w-full rounded-xl" onClick={() => setShowAllVenues(true)}>
              Show more venues
            </Button>
          )}
          {showAllVenues && orderedClubs.length > 3 && (
            <Button type="button" variant="ghost" className="w-full rounded-xl" onClick={() => setShowAllVenues(false)}>
              Show main venues
            </Button>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-champagne-700/28 bg-[radial-gradient(circle_at_top_right,rgba(216,183,100,0.14),transparent_36%),rgba(255,255,255,0.045)] p-3.5">
            <div className="flex items-center gap-3">
              <VenueLogo club={selectedClub} monogram={selectedExperience.monogram} size="xl" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-champagne-300">{selectedExperience.mood}</p>
                <h2 className="font-serif text-2xl">{selectedExperience.wordmark}</h2>
                <p className="text-sm text-muted-foreground">{selectedExperience.tagline}</p>
              </div>
            </div>
          </div>
          <StepIntro title="What should we arrange?" description="Pick the closest option. Your host can fine-tune it after." />
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
                  "group relative flex min-h-[7.1rem] flex-col justify-between rounded-2xl border p-3 text-left transition active:scale-[0.99]",
                  active ? "border-champagne-300 bg-champagne-300/14 shadow-glow" : "border-champagne-700/28 bg-ink-950/48 hover:border-champagne-300/55"
                )}
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-ink-950/60 text-champagne-300">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold text-champagne-50">{service.label}</span>
                  <span className="mt-1 block line-clamp-2 text-xs leading-snug text-champagne-100/74">{service.description}</span>
                  {service.priceHint && <span className="mt-2 inline-flex rounded-full border border-champagne-700/30 px-2 py-0.5 text-[10px] text-champagne-200">{service.priceHint}</span>}
                </span>
                {active && <Check className="absolute right-3 top-3 size-4 text-champagne-300" />}
              </button>
              );
            })}
          </div>
          {selectedClubEvents.length > 0 && (
            <div className="rounded-2xl border border-champagne-700/28 bg-white/[0.045] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-champagne-300">Occasions</p>
                  <p className="mt-1 text-sm text-muted-foreground">Optional. Tap an event to request that date.</p>
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
                        "flex w-full items-start gap-3 rounded-md border p-2.5 text-left transition",
                        active ? "border-champagne-300 bg-champagne-500/12" : "border-champagne-700/25 bg-ink-950/45"
                      )}
                    >
                      <CalendarDays className="mt-0.5 size-5 shrink-0 text-champagne-300" />
                      <span className="min-w-0">
                        <span className="block font-semibold leading-tight">{event.name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{formatEventDate(event.event_date)}{customerEventDescription(event.description) ? ` · ${customerEventDescription(event.description)}` : ""}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <StepIntro title="Who should we contact?" description="Your WhatsApp number is required so your host can reply and keep future requests connected." />
          <div className="flex items-start gap-2 rounded-xl border border-champagne-700/24 bg-white/[0.045] p-3 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-champagne-300" />
            <span>Your details only go to the hosting team so they can reply and confirm availability.</span>
          </div>
          <Field label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="Full name" autoComplete="name" />
          </Field>
          <Field label="WhatsApp number" error={form.formState.errors.phone?.message}>
            <Input {...form.register("phone")} placeholder="+34 600 000 000" inputMode="tel" autoComplete="tel" />
          </Field>
          <p className="-mt-2 text-xs leading-5 text-muted-foreground">
            Use the same number each time. We will match your requests by WhatsApp number, even if the name is written differently.
          </p>
          <Field label="Email optional" error={form.formState.errors.email?.message}>
            <Input {...form.register("email")} placeholder="name@email.com" inputMode="email" autoComplete="email" />
          </Field>
          <Field label="Instagram optional">
            <Input {...form.register("instagram")} placeholder="@handle" />
          </Field>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <StepIntro title={isMultiDayRequest ? "Which dates?" : "When are you going?"} description={isMultiDayRequest ? "Choose the start and end dates. Add any extra timing notes below." : "Approximate times are fine. Add anything we should know."} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={isMultiDayRequest ? "Start date" : "Date"} error={form.formState.errors.requestedDate?.message}>
              <Input {...form.register("requestedDate")} type="date" min={new Date().toISOString().slice(0, 10)} />
            </Field>
            {isMultiDayRequest ? (
              <Field label="End date" error={form.formState.errors.requestedDateEnd?.message}>
                <Input {...form.register("requestedDateEnd")} type="date" min={values.requestedDate || new Date().toISOString().slice(0, 10)} />
              </Field>
            ) : (
            <Field label="Guests" error={form.formState.errors.guestCount?.message}>
              <div className="grid grid-cols-[2.75rem_1fr_2.75rem] overflow-hidden rounded-md border border-champagne-700/35 bg-input">
                <button type="button" aria-label="Remove guest" className="flex min-h-12 items-center justify-center border-r border-champagne-700/35 text-champagne-300" onClick={() => setGuestCount(Number(values.guestCount || 1) - 1)}>
                  <Minus className="size-4" />
                </button>
                <Input {...form.register("guestCount")} type="number" min={1} inputMode="numeric" className="border-0 bg-transparent text-center shadow-none focus:ring-0" />
                <button type="button" aria-label="Add guest" className="flex min-h-12 items-center justify-center border-l border-champagne-700/35 text-champagne-300" onClick={() => setGuestCount(Number(values.guestCount || 1) + 1)}>
                  <Plus className="size-4" />
                </button>
              </div>
            </Field>
            )}
          </div>
          {isMultiDayRequest && (
            <Field label="Guests" error={form.formState.errors.guestCount?.message}>
              <div className="grid grid-cols-[2.75rem_1fr_2.75rem] overflow-hidden rounded-md border border-champagne-700/35 bg-input">
                <button type="button" aria-label="Remove guest" className="flex min-h-12 items-center justify-center border-r border-champagne-700/35 text-champagne-300" onClick={() => setGuestCount(Number(values.guestCount || 1) - 1)}>
                  <Minus className="size-4" />
                </button>
                <Input {...form.register("guestCount")} type="number" min={1} inputMode="numeric" className="border-0 bg-transparent text-center shadow-none focus:ring-0" />
                <button type="button" aria-label="Add guest" className="flex min-h-12 items-center justify-center border-l border-champagne-700/35 text-champagne-300" onClick={() => setGuestCount(Number(values.guestCount || 1) + 1)}>
                  <Plus className="size-4" />
                </button>
              </div>
            </Field>
          )}
          <div className="grid grid-cols-3 gap-2">
            <QuickPick label="Tonight" onClick={() => form.setValue("requestedDate", dateString(0), { shouldValidate: true })} />
            <QuickPick label="Tomorrow" onClick={() => form.setValue("requestedDate", dateString(1), { shouldValidate: true })} />
            <QuickPick label="Weekend" onClick={() => form.setValue("requestedDate", nextWeekendDate(), { shouldValidate: true })} />
          </div>
          <Field label="Arrival time optional">
            <Input {...form.register("arrivalTime")} placeholder="Around 01:00" />
          </Field>
          <div className="grid grid-cols-4 gap-2">
            {["21:00", "23:00", "01:00", "TBC"].map((time) => (
              <QuickPick key={time} label={time} active={values.arrivalTime === time} onClick={() => form.setValue("arrivalTime", time, { shouldValidate: true })} />
            ))}
          </div>
          <Field label="Budget optional">
            <Input {...form.register("budget")} placeholder="Bottle service, 1k, flexible..." />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            {["Flexible", "1k+", "2k+"].map((budget) => (
              <QuickPick key={budget} label={budget} active={values.budget === budget} onClick={() => form.setValue("budget", budget, { shouldValidate: true })} />
            ))}
          </div>
          <Field label="Message optional">
            <Textarea {...form.register("message")} placeholder="Occasion, preferred area, special requests..." />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            {["Birthday", "Best table possible", "Flexible timing", "Need fast reply"].map((note) => (
              <QuickPick
                key={note}
                label={note}
                active={values.message?.includes(note)}
                onClick={() => {
                  const current = values.message?.trim();
                  form.setValue("message", current ? `${current}${current.includes(note) ? "" : `, ${note}`}` : note, { shouldValidate: true });
                }}
              />
            ))}
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-4">
          <StepIntro title="Ready to send" description="Your host receives this and checks availability personally." />
          <div className="rounded-2xl border border-champagne-700/28 bg-white/[0.055] p-3.5 text-sm shadow-panel">
            <div className="mb-3 flex items-center gap-3">
              <VenueLogo club={selectedClub} monogram={selectedExperience.monogram} size="md" />
              <div>
                <p className="text-lg font-semibold">{selectedExperience.wordmark}</p>
                <p className="text-muted-foreground">{values.serviceLabel || formatEnum(values.requestType)}</p>
                {selectedServiceHint(selectedExperience.services, values.serviceLabel) && (
                  <p className="text-champagne-300">{selectedServiceHint(selectedExperience.services, values.serviceLabel)}</p>
                )}
                {selectedOccasion && <p className="text-champagne-300">{selectedOccasion.name} · {formatEventDate(selectedOccasion.event_date)}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <ReviewFact icon={CalendarDays} label={isMultiDayRequest ? "Dates" : "Date"} value={isMultiDayRequest && values.requestedDateEnd ? `${values.requestedDate} to ${values.requestedDateEnd}` : values.requestedDate} />
              <ReviewFact icon={Users} label="Guests" value={String(values.guestCount)} />
              <ReviewFact icon={Clock} label="Arrival" value={values.arrivalTime || "TBC"} />
            </div>
            <div className="mt-3 rounded-xl bg-ink-950/58 p-3">
              <p className="font-semibold">{values.name}</p>
              <p className="text-muted-foreground">{values.phone}</p>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-champagne-300" />
            <span>By sending, you ask the team to check availability. Nothing is confirmed until your host replies.</span>
            </p>
          </div>
        </div>
      )}

      {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-red-100">{error}</p>}
      </div>

      <div className="request-action-bar flex gap-3 border-t border-champagne-700/24 bg-ink-950/82 p-3 backdrop-blur-xl">
        {step > 1 && (
          <Button type="button" variant="secondary" size="lg" className="rounded-xl" onClick={() => setStep((current) => current - 1)}>
            <ChevronLeft className="size-5" />
          </Button>
        )}
        {step < 6 ? (
          <Button type="button" className="flex-1 rounded-xl" size="lg" onClick={next} disabled={!clubs.length}>
            {nextLabel}
          </Button>
        ) : (
          <Button type="button" className="flex-1 rounded-xl" size="lg" onClick={submit} disabled={pending}>
            <Check className="size-5" />
            {pending ? "Sending" : "Send request"}
          </Button>
        )}
      </div>
    </section>
  );
}

function StepIntro({ title, description }: Readonly<{ title: string; description: string }>) {
  return (
    <div className="space-y-1">
      <h2 className="font-serif text-[1.7rem] leading-tight text-champagne-50">{title}</h2>
      <p className="text-sm leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function selectedServiceHint(services: ReturnType<typeof getClubVenueExperience>["services"], serviceLabel?: string) {
  return services.find((service) => service.label === serviceLabel)?.priceHint ?? "";
}

function VenueLogo({ club, monogram, size = "md" }: Readonly<{ club?: Club | null; monogram: string; size?: "md" | "lg" | "xl" }>) {
  const sizeClass = size === "xl" ? "size-16" : size === "lg" ? "size-14" : "size-12";

  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-champagne-500/35 bg-ink-950/70 font-serif text-champagne-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]", sizeClass)}>
      {club?.image_url ? (
        <img src={club.image_url} alt={`${club.name} logo`} className="h-full w-full object-contain p-1.5" />
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
    <div className="rounded-xl bg-ink-950/60 p-2.5">
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Icon className="size-3.5 text-champagne-300" />{label}</p>
      <p className="mt-1 truncate font-semibold">{value}</p>
    </div>
  );
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}

function customerEventDescription(description?: string | null) {
  const value = description?.trim();
  if (!value) return "";
  if (/confirm manually|recurring after party pattern|programming changes/i.test(value)) return "";
  return value.length > 72 ? `${value.slice(0, 69)}...` : value;
}

function Field({ label, error, children }: Readonly<{ label: string; error?: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] text-champagne-50/88">{label}</Label>
      {children}
      {error && <p className="text-sm text-red-200">{error}</p>}
    </div>
  );
}

function QuickPick({ label, active, onClick }: Readonly<{ label: string; active?: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-xl border border-champagne-700/30 bg-white/[0.045] px-2 text-sm font-medium text-muted-foreground transition active:scale-[0.98]",
        active && "border-champagne-300 bg-champagne-300/10 text-champagne-100"
      )}
    >
      {label}
    </button>
  );
}

function dateString(offset: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function nextWeekendDate() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const day = date.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilSaturday);
  return date.toISOString().slice(0, 10);
}

function inferInitialCategory(requestType?: string): RequestCategory | null {
  if (!requestType) return null;
  if (requestType === "BOAT") return "boat";
  if (requestType === "GOLF") return "golf";
  if (requestType === "VILLA") return "villa";
  if (requestType === "TRANSFER") return "transfer";
  if (requestType === "SCHEDULE") return "schedule";
  if (requestType === "PACKAGE") return "package";
  return "nightlife";
}
