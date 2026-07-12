"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateClubExperience } from "@/lib/actions/management-actions";
import type { RequestType } from "@/lib/types";

type EditableService = {
  id: string;
  label: string;
  description: string;
  requestType: RequestType;
  icon: string;
  active: boolean;
};

const requestTypes: RequestType[] = ["GUESTLIST", "TABLE", "VIP_SERVICE", "GENERAL"];
const icons = ["Calendar", "Crown", "GlassWater", "Music2", "Sparkles", "Sun", "Utensils", "Users", "Waves"];

export function ClubExperienceForm({
  clubId,
  monogram,
  tagline,
  mood,
  services
}: Readonly<{ clubId: string; monogram: string; tagline: string; mood: string; services: EditableService[] }>) {
  const [items, setItems] = useState<EditableService[]>(services.map((service) => ({ ...service, active: service.active !== false })));
  const activeItems = useMemo(() => items.filter((item) => item.active), [items]);

  function updateService(index: number, patch: Partial<EditableService>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function addService() {
    setItems((current) => [
      ...current,
      {
        id: `service-${Date.now()}`,
        label: "New service",
        description: "",
        requestType: "VIP_SERVICE",
        icon: "Sparkles",
        active: true
      }
    ]);
  }

  return (
    <form action={updateClubExperience} className="mt-4 grid gap-3">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="services" value={JSON.stringify(activeItems)} />
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-2"><Label>Monogram</Label><Input name="monogram" defaultValue={monogram} maxLength={8} placeholder="LP" /></div>
        <div className="space-y-2 sm:col-span-2"><Label>Tagline</Label><Input name="tagline" defaultValue={tagline} placeholder="Beachfront lunch, sunset, VIP hosting" /></div>
        <div className="space-y-2 sm:col-span-3"><Label>Mood label</Label><Input name="mood" defaultValue={mood} placeholder="Golden hour beach club" /></div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label>Services</Label>
          <Button type="button" variant="outline" size="sm" onClick={addService}><Plus className="size-4" /> Add service</Button>
        </div>
        {items.map((service, index) => service.active && (
          <div key={service.id} className="rounded-md border border-champagne-700/30 bg-background/35 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={service.label} onChange={(event) => updateService(index, { label: event.target.value })} aria-label="Service label" placeholder="VIP table" />
              <select value={service.requestType} onChange={(event) => updateService(index, { requestType: event.target.value as RequestType })} className="h-12 rounded-md border bg-input px-3 text-sm">
                {requestTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
              </select>
              <select value={service.icon} onChange={(event) => updateService(index, { icon: event.target.value })} className="h-12 rounded-md border bg-input px-3 text-sm">
                {icons.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
              </select>
              <Button type="button" variant="outline" onClick={() => updateService(index, { active: false })}><Trash2 className="size-4" /> Remove</Button>
              <Input className="sm:col-span-2" value={service.description} onChange={(event) => updateService(index, { description: event.target.value })} aria-label="Service description" placeholder="Short description shown on the request form" />
            </div>
          </div>
        ))}
        {!activeItems.length && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-red-100">Add at least one service before saving.</p>}
      </div>

      <Button type="submit" variant="secondary" disabled={!activeItems.length}>Save request experience</Button>
    </form>
  );
}
