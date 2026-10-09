import { z } from "zod";
import { conditions, priorities, maintenanceTypes } from "./ratings.js";
export const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .refine(
    (p) =>
      /[a-z]/.test(p) &&
      /[A-Z]/.test(p) &&
      /[0-9]/.test(p) &&
      /[^A-Za-z0-9]/.test(p),
    "Include uppercase, lowercase, a number and a symbol.",
  );
export const emailSchema = z
  .email()
  .max(254)
  .transform((v) => v.trim().toLowerCase());
const optionalText = z.string().max(500).default("");
const date = z.union([z.literal(""), z.iso.date()]).default("");
export const assetSchema = z.object({
  id: z.string().regex(/^[A-Z0-9-]{1,40}$/),
  location: z.string().trim().min(1).max(500),
  company: z.string().trim().min(1).max(500),
  advertiser: optionalText,
  contact: optionalText,
  email: z.union([z.literal(""), z.email()]).default(""),
  phone: optionalText,
  gps: optionalText,
  last: date,
  next: date,
  comments: z.string().max(10000).default(""),
  condition: z
    .enum(conditions as [string, ...string[]])
    .default("Not assessed"),
  priority: z.enum(priorities as [string, ...string[]]).default("Not assigned"),
  maintenanceType: z
    .enum(maintenanceTypes as [string, ...string[]])
    .default("Not specified"),
  mode: z.enum(["create", "edit"]),
});
export const ratingSchema = z.object({
  id: z.string().regex(/^[A-Z0-9-]{1,40}$/),
  condition: z.enum(conditions as [string, ...string[]]),
  priority: z.enum(priorities as [string, ...string[]]),
});
