import { z } from "zod";

export const SigneeSchema = z.object({
  name: z.string(),
  designation: z.string(),
  e_sig: z.string().optional(),
});

export const CertificateDataSchema = z.object({
  student_name: z.string(),
  event_name: z.string(),
  event_theme: z.string().optional(),
  event_date: z.string(),
  event_start_time: z.string(),
  event_end_time: z.string(),
  event_venue: z.string().optional(),
  event_venue_specific: z.string(),
  signees: z.array(SigneeSchema),
  images: z.record(z.string(), z.string()).optional(),
  fonts: z.record(z.string(), z.string()),
});
