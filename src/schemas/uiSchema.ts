import { z } from "zod";
import { EmploymentType } from "../enums/EmploymentType";

const nonEmptyString = z.string().min(1);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a #rrggbb colour");
const unitInterval = z.number().min(0).max(1);

const employmentViewSchema = z.strictObject({ label: nonEmptyString, icon: nonEmptyString });

/** Parameters of the algorithm that derives a pill tint from a brand's logo colour (src/lib/brandTint). */
const brandTintSchema = z.strictObject({
  unknownBrandColor: hexColor,
  anchors: z.strictObject({ taupe: hexColor, teal: hexColor, violet: hexColor }),
  mutedBelowSaturation: unitInterval,
  darkBelowLightness: unitInterval,
  darkTealMix: unitInterval,
  darkLift: z.strictObject({ belowLightness: unitInterval, lightness: unitInterval, minSaturation: unitInterval }),
  lightDampen: z.strictObject({
    aboveLightness: unitInterval,
    lightness: unitInterval,
    minSaturation: unitInterval,
    maxSaturation: unitInterval,
  }),
  midTone: z.strictObject({
    saturationGain: z.number().positive(),
    saturationBoost: unitInterval,
    maxSaturation: unitInterval,
    minLightness: unitInterval,
    maxLightness: unitInterval,
  }),
  taupeMix: unitInterval,
  violetMix: unitInterval,
});

export const uiSchema = z.strictObject({
  $comment: z.string().optional(),
  vocabulary: z.strictObject({
    articlePlatforms: z.array(nonEmptyString).min(1),
    heroCardTints: z.array(nonEmptyString).min(1),
    createBandVariants: z.array(nonEmptyString).min(1),
  }),
  employmentTypes: z.strictObject({
    [EmploymentType.Permanent]: employmentViewSchema,
    [EmploymentType.Contract]: employmentViewSchema,
  }),
  derivedStats: z.strictObject({ yearsOfExperienceIcon: nonEmptyString, companyCountIcon: nonEmptyString }),
  fallbackIconName: nonEmptyString,
  accents: z.strictObject({
    serviceRows: z.array(nonEmptyString).min(1),
    experienceRoles: z.array(nonEmptyString).min(1),
    skillGroups: z.array(nonEmptyString).min(1),
    statTiles: z.array(nonEmptyString).min(1),
    educationRows: z.array(nonEmptyString).min(1),
  }),
  brandIconBasePath: z.string().regex(/^\/assets\//),
  partnerFallbackColor: hexColor,
  brandTint: brandTintSchema,
});
