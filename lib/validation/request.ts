import { z } from "zod";

export const requestTypeSchema = z.enum(["GUESTLIST", "TABLE", "VIP_SERVICE", "GENERAL"]);

export const publicRequestSchema = z.object({
  clubId: z.string().uuid("Choose a club."),
  requestType: requestTypeSchema,
  name: z.string().trim().min(2, "Enter the guest name.").max(100),
  phone: z.string().trim().min(6, "Enter a WhatsApp number.").max(30).regex(/^[+\d][\d\s()-]+$/, "Enter a valid WhatsApp number."),
  email: z.string().email("Enter a valid email.").optional().or(z.literal("")),
  instagram: z.string().trim().max(80).optional().or(z.literal("")),
  requestedDate: z.string().min(1, "Choose a date.").refine((value) => value >= new Date().toISOString().slice(0, 10), "Choose today or a future date."),
  arrivalTime: z.string().max(40).optional().or(z.literal("")),
  guestCount: z.coerce.number().int().min(1).max(200),
  budget: z.string().max(100).optional().or(z.literal("")),
  message: z.string().max(1200).optional().or(z.literal("")),
  serviceLabel: z.string().trim().max(120).optional().or(z.literal("")),
  occasionId: z.string().trim().max(120).optional().or(z.literal("")),
  occasionName: z.string().trim().max(160).optional().or(z.literal("")),
  occasionDate: z.string().trim().max(20).optional().or(z.literal("")),
  promoterSlug: z.string().optional(),
  magicToken: z.string().optional()
});

export const manualRequestSchema = publicRequestSchema.extend({
  clientId: z.string().uuid().optional().or(z.literal("")),
  internalNote: z.string().max(1200).optional().or(z.literal(""))
});

export type PublicRequestInput = z.infer<typeof publicRequestSchema>;
export type ManualRequestInput = z.infer<typeof manualRequestSchema>;
