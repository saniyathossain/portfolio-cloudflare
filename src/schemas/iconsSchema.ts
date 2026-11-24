import { z } from "zod";

const aliasTargetSchema = z.union([z.string().min(1), z.strictObject({ social: z.string().min(1) })]);

export const iconsSchema = z.strictObject({
  $comment: z.string().optional(),
  lucide: z.record(z.string().min(1), z.string().min(1)),
  social: z.record(z.string().min(1), z.string().min(1)),
  aliases: z.record(z.string().min(1), aliasTargetSchema),
});
