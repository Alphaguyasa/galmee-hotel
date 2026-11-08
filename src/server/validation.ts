import { z } from "zod";

export const MIN_PASSWORD = 10;

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().max(128),
});

export const signupSchema = credentialsSchema.extend({
  password: z.string().min(MIN_PASSWORD).max(128),
});

// Ethiopian mobile/landline: 09xxxxxxxx, 07xxxxxxxx or +2519xxxxxxxx; spaces and dashes allowed.
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(\+251|0)[1-9]\d{8}$/));

export const onboardingSchema = z.object({
  hotelName: z.string().trim().min(2).max(120),
  fullName: z.string().trim().min(2).max(120),
  phone: phoneSchema,
});

export function formToObject(formData: FormData, keys: readonly string[]) {
  return Object.fromEntries(keys.map((k) => [k, formData.get(k) ?? ""]));
}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuid = z.string().uuid();
const money = z.coerce.number().positive().max(100_000_000);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || undefined);

export const dayParam = day;
export const uuidParam = uuid;

export const newStaySchema = z
  .object({
    room: uuid,
    guestName: z.string().trim().min(2).max(120),
    guestPhone: z.union([z.literal(""), phoneSchema]).transform((v) => v || undefined),
    checkIn: day,
    checkOut: day,
    adults: z.coerce.number().int().min(1).max(20),
    children: z.coerce.number().int().min(0).max(20),
    nightlyRate: z.union([z.literal(""), z.coerce.number().min(0).max(10_000_000)]).transform((v) => (v === "" ? undefined : v)),
    source: z.enum(["walk_in", "phone", "website", "other"]),
    checkInNow: z.string().transform((v) => v === "on"),
    clientRef: uuid,
    request: z.union([z.literal(""), uuid]).transform((v) => v || undefined),
  })
  .refine((v) => v.checkOut > v.checkIn, { path: ["checkOut"] });

export const checkInSchema = z.object({
  stay: uuid,
  idType: z.enum(["kebele", "national", "passport", "driving", "other"]),
  idNumber: z.string().trim().min(2).max(40),
  nationality: optionalText(60),
});

export const chargeSchema = z.object({
  stay: uuid,
  kind: z.enum(["food", "drink", "laundry", "other"]),
  description: optionalText(200),
  amount: money,
  clientRef: uuid,
});

export const paymentSchema = z.object({
  stay: uuid,
  amount: money,
  method: z.enum(["cash", "telebirr", "cbe_birr", "bank", "other"]),
  reference: optionalText(80),
  clientRef: uuid,
});

export const checkOutSchema = z.object({
  stay: uuid,
  amount: z.coerce.number().min(0).max(100_000_000),
  method: z.enum(["cash", "telebirr", "cbe_birr", "bank", "other"]),
  reference: optionalText(80),
  leaveBalance: z.string().transform((v) => v === "on"),
});

export const roomTypeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  capacity: z.coerce.number().int().min(1).max(20),
  rate: z.coerce.number().min(0).max(10_000_000),
});

export const rateSchema = z.object({
  roomType: uuid,
  rate: z.coerce.number().min(0).max(10_000_000),
});

export const roomSchema = z.object({
  number: z.string().trim().min(1).max(12),
  roomType: uuid,
  floor: optionalText(20),
});

export const bookingRequestSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]{3,40}$/),
    guestName: z.string().trim().min(2).max(120),
    phone: phoneSchema,
    checkIn: day,
    checkOut: day,
    roomType: z.union([z.literal(""), uuid]).transform((v) => v || undefined),
    adults: z.coerce.number().int().min(1).max(20),
    message: optionalText(500),
  })
  .refine((v) => v.checkOut > v.checkIn, { path: ["checkOut"] });

export const siteSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/),
  displayName: z.string().trim().min(2).max(120),
  headline: optionalText(160),
  about: optionalText(1200),
  address: optionalText(240),
  phone: z.union([z.literal(""), phoneSchema]).transform((v) => v || undefined),
  receptionTelegram: z
    .string()
    .trim()
    .regex(/^(-?\d{5,20})?$/)
    .transform((v) => v || undefined),
  published: z.string().transform((v) => v === "on"),
});
