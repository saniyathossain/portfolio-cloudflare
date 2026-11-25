import type { z } from "zod";
import type { clientSignaturesSchema } from "../schemas/clientSignaturesSchema";

export type ClientSignatures = z.infer<typeof clientSignaturesSchema>;
export type VersionedSignature = ClientSignatures["browsers"][number];
export type DeviceSignature = ClientSignatures["devices"][number];
