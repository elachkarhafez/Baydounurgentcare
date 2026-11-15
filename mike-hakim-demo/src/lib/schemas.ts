import { z } from "zod";
import { detroitYmd, detroitToUtc } from "@/lib/time";

const phoneDigits = (s: string) => s.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");

export const documentMetaSchema = z.object({ name: z.string().min(1).max(200), type: z.enum(["PDF", "JPG", "PNG"]), size: z.number().int().positive().max(10 * 1024 * 1024) });

export const showingSchema = z
  .object({
    date: z.string().min(1, "Pick a day for your tour"),
    time: z.string().min(1, "Pick a time slot"),
    altDate: z.string().optional().default(""),
    altTime: z.string().optional().default(""),
    firstName: z.string().trim().min(1, "Enter your first name").max(60),
    lastName: z.string().trim().min(1, "Enter your last name").max(60),
    email: z.string().trim().min(1, "Enter your email").email("That email doesn't look right"),
    phone: z.string().trim().refine((v) => phoneDigits(v).length === 10, "Enter a 10-digit phone number"),
    buyerStatus: z.enum(["first_time", "searching", "ready", "exploring"]).optional(),
    financing: z.enum(["pre_approved", "cash", "not_yet"], { message: "Let Mike know how you're paying" }),
    notes: z.string().max(1000, "Keep your message under 1,000 characters").optional().default(""),
    document: documentMetaSchema.nullable(),
  })
  .superRefine((v, ctx) => {
    const today = detroitYmd();
    if (v.date && v.date < today) ctx.addIssue({ code: "custom", path: ["date"], message: "Pick a date that hasn't passed" });
    if (v.date && v.time && detroitToUtc(v.date, v.time).getTime() < Date.now()) ctx.addIssue({ code: "custom", path: ["time"], message: "That time has already passed" });
    if ((v.altDate && !v.altTime) || (!v.altDate && v.altTime)) ctx.addIssue({ code: "custom", path: ["altTime"], message: "Pick a day and a time for the backup, or remove it" });
    if (v.altDate && v.altTime && v.altDate === v.date && v.altTime === v.time) ctx.addIssue({ code: "custom", path: ["altTime"], message: "The backup time should be different from your first choice" });
  });

export type ShowingForm = z.input<typeof showingSchema>;

export const questionSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().email("That email doesn't look right"),
  phone: z.string().trim().refine((v) => v === "" || phoneDigits(v).length === 10, "Enter a 10-digit phone number or leave it empty"),
  message: z.string().trim().min(5, "Add a short question").max(1000),
});
export type QuestionForm = z.infer<typeof questionSchema>;

export function formatPhone(v: string) {
  const d = phoneDigits(v).slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
