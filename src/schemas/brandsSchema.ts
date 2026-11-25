import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a #rrggbb colour");

export const brandsSchema = z.strictObject({
  $comment: z.string().optional(),
  entries: z.record(
    z.string().min(1),
    z.strictObject({ icon: z.string().min(1), color: hexColor, tint: hexColor.optional() }),
  ),
});
