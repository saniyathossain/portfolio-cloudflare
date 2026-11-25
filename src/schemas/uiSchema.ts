import { z } from "zod";
import { EditorialMatchMode } from "../enums/EditorialMatchMode";
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
  heroCard: z.strictObject({
    /** Exit duration (ms) of the caption/title slide before the content swaps. */
    swapMs: z.number().int().min(1),
    fallbackTint: nonEmptyString,
    /** Tint name → CSS values for the badge's `--tint` / `--tint-ink` custom properties. */
    /** Names of the badge tints; the colours live in styles.css under `.hero-card__badge[data-tint="<name>"]`. */
    tintNames: z.array(nonEmptyString).min(1),
    previousLabel: nonEmptyString,
    nextLabel: nonEmptyString,
    previousIcon: z.strictObject({ name: nonEmptyString, classes: nonEmptyString }),
    nextIcon: z.strictObject({ name: nonEmptyString, classes: nonEmptyString }),
    badgeIconClasses: nonEmptyString,
  }),
  /** Tools & craft flat strip: mobile "View more" accordion. */
  skillsFlat: z.strictObject({
    collapsedLimit: z.number().int().min(1),
    mobileMaxWidthPx: z.number().int().min(1),
    openMs: z.number().int().min(0),
    closeMs: z.number().int().min(0),
    settleMarginMs: z.number().int().min(0),
    easing: nonEmptyString,
    reducedMotionQuery: nonEmptyString,
    chevronIcon: z.strictObject({ name: nonEmptyString, classes: nonEmptyString }),
  }),
  /** Experience accordion (src/islands/ExperienceAccordion.tsx): height-transition timings and easings. */
  experienceAccordion: z.strictObject({
    openMs: z.number().int().min(0),
    closeMs: z.number().int().min(0),
    /** Extra wait past the transition before the fallback timer force-finishes it (Safari paint starvation). */
    settleMarginMs: z.number().int().min(0),
    /** Overshooting back-out curve used on open only. */
    openEasing: nonEmptyString,
    closeEasing: nonEmptyString,
    reducedMotionQuery: nonEmptyString,
  }),
  behavior: z.strictObject({
    /** scrollY (px) past which the back-to-top control appears. */
    backToTopRevealPx: z.number().int().min(1),
    /** scrollY (px) past which the header glass intensifies. */
    headerScrolledPx: z.number().int().min(1),
  }),
  /** Menu / modal / hash-navigation timings and endpoints (src/client/actions.ts + the shell islands). */
  shell: z.strictObject({
    /** Menu -> modal hand-off delay (keeps the scroll lock continuous). */
    menuHandoffMs: z.number().int().min(0),
    /** Delay between closing the menu and the section smooth-scroll. */
    navScrollMs: z.number().int().min(0),
    /** Clears the modal's form state after its close animation. */
    modalResetMs: z.number().int().min(0),
    /** Max life of the liquid-warp pulse during a nav scroll (scrollend fallback). */
    liquidWarpMs: z.number().int().min(1),
    /** Gap (px) kept above a section when scrolling to it. */
    scrollOffsetPx: z.number().int().min(0),
    navOverlay: z.strictObject({
      ariaLabel: nonEmptyString,
      closeLabel: nonEmptyString,
      localTimeLabel: nonEmptyString,
      contactLabel: nonEmptyString,
    }),
    /** Visually hidden bot-trap field label in the contact form. */
    honeypotLabel: nonEmptyString,
    /** Durations (ms) of the form-error fade in / out — slightly above the CSS transition lengths. */
    errorEnterMs: z.number().int().min(1),
    errorLeaveMs: z.number().int().min(1),
    /** Header menu button text + aria-label for each state. */
    menuButton: z.strictObject({
      openLabel: nonEmptyString,
      closeLabel: nonEmptyString,
      openAriaLabel: nonEmptyString,
      closeAriaLabel: nonEmptyString,
    }),
    contactEndpoint: z.string().regex(/^\//),
    turnstileScriptUrl: z.url(),
  }),
  editorial: z.strictObject({
    /** Motion timings (ms) of the Editorial dock, filter swap and tab-count tickers. */
    motionMs: z.strictObject({
      lensTravel: z.number().int().min(1),
      exit: z.number().int().min(1),
      enter: z.number().int().min(1),
      reducedEnter: z.number().int().min(1),
      countUp: z.number().int().min(1),
      dockUnlock: z.number().int().min(1),
    }),
    tilt: z.strictObject({ maxDeg: z.number().positive(), stiffness: unitInterval, settleThreshold: z.number().positive() }),
    settleMarginMs: z.number().int().min(0),
    reflowTolerancePx: z.number().min(0),
    lensTravelThresholdPx: z.number().min(0),
    countRevealThreshold: unitInterval,
    fallbackEase: nonEmptyString,
    reducedMotionQuery: nonEmptyString,
    finePointerQuery: nonEmptyString,
    dateLocale: nonEmptyString,
    dateTimeSuffix: nonEmptyString,
    /** Tint hue cycle applied to rows by index. */
    rowTints: z.array(nonEmptyString).min(1),
    fallbackExcerpt: nonEmptyString,
    /** Icon used when no platform tab claims an article. */
    fallbackPlatformIcon: nonEmptyString,
    iconClasses: z.strictObject({ sm: nonEmptyString, md: nonEmptyString }),
    tabs: z
      .array(
        z.strictObject({
          key: nonEmptyString,
          label: nonEmptyString,
          icon: nonEmptyString.nullable(),
          ci: nonEmptyString,
          match: z.strictObject({ mode: z.enum(EditorialMatchMode), value: z.string() }),
        }),
      )
      .min(1),
  }),
  clock: z.strictObject({
    tickMs: z.number().int().min(250),
    meridiem: z.strictObject({ am: nonEmptyString, pm: nonEmptyString }),
    monthNames: z.array(nonEmptyString).length(12),
    dateSeparator: nonEmptyString,
  }),
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
