import { z } from "zod";
import { DeviceType } from "../enums/DeviceType";
import { regexSourceSchema } from "./regexSourceSchema";

/** `pattern` must capture the version in group 1 (optional); the first matching signature wins, so order matters. */
const versionedSignatureSchema = z.strictObject({
  name: z.string().min(1),
  pattern: regexSourceSchema,
  /** Replace "_" with "." in the captured version (e.g. macOS "10_15_7"). */
  underscoreVersion: z.boolean().optional(),
});

const deviceSignatureSchema = z.strictObject({
  type: z.enum([DeviceType.Mobile, DeviceType.Tablet, DeviceType.Desktop]),
  vendor: z.string().min(1),
  /** Matches the User-Agent; group 1, when present, is the model. */
  pattern: regexSourceSchema,
});

const botSignatureSchema = z.strictObject({
  category: z.string().regex(/^[a-z]+$/),
  pattern: regexSourceSchema,
});

export const clientSignaturesSchema = z.strictObject({
  $comment: z.string().optional(),
  browsers: z.array(versionedSignatureSchema).min(1),
  engines: z.array(versionedSignatureSchema).min(1),
  operatingSystems: z.array(versionedSignatureSchema).min(1),
  devices: z.array(deviceSignatureSchema).min(1),
  bots: z.array(botSignatureSchema).min(1),
});
