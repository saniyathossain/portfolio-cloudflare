import { z } from "zod";
import type { UiConfig } from "../types/UiConfig";
import { EmploymentType } from "../enums/EmploymentType";
import { NavAction } from "../enums/NavAction";

const nonEmptyString = z.string().min(1);
const urlString = z.url();
const assetPath = z.string().regex(/^\/assets\//, "must be an /assets/ path");
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a #rrggbb colour");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

const contactFieldSchema = z.strictObject({ label: nonEmptyString, placeholder: nonEmptyString });

const underConstructionNoticeSchema = z.strictObject({
  enabled: z.boolean(),
  title: nonEmptyString,
  message: nonEmptyString,
  mailLabel: nonEmptyString,
});

const siteSchema = z.strictObject({
  title: nonEmptyString,
  description: nonEmptyString,
  url: urlString,
  themeColor: hexColor,
  keywords: nonEmptyString,
  aboutHeading: nonEmptyString,
  aboutKicker: nonEmptyString,
  aboutLead: nonEmptyString,
  aboutHighlights: z.array(nonEmptyString),
  experienceHighlights: z.array(nonEmptyString),
  footerTagline: nonEmptyString,
  ogDescription: nonEmptyString,
  twitterDescription: nonEmptyString,
  ogImage: assetPath,
  turnstileSiteKey: z.string(),
  contactModal: z.strictObject({
    titlebarLabel: nonEmptyString,
    closeAriaLabel: nonEmptyString,
    heading: nonEmptyString,
    fields: z.strictObject({
      name: contactFieldSchema,
      email: contactFieldSchema,
      project: contactFieldSchema,
    }),
    footerNote: nonEmptyString,
    errorNote: nonEmptyString,
    submitLabel: nonEmptyString,
    submittingLabel: nonEmptyString,
    success: z.strictObject({ heading: nonEmptyString, message: nonEmptyString, closeLabel: nonEmptyString }),
  }),
  features: z.strictObject({
    flags: z.strictObject({ skillsScrollDesign: z.strictObject({ enabled: z.boolean() }) }),
    underConstruction: z.strictObject({ contactForm: underConstructionNoticeSchema }),
  }),
  analytics: z.strictObject({ googleId: z.string(), cloudflareToken: z.string() }),
});

const sectionCopySchema = z.strictObject({
  services: nonEmptyString,
  experience: nonEmptyString,
  skills: nonEmptyString,
  editorial: nonEmptyString,
  education: nonEmptyString,
});

const outboundLinkSchema = z.strictObject({
  label: nonEmptyString,
  href: urlString,
  icon: nonEmptyString,
  ci: nonEmptyString,
});

const profileSchema = z.strictObject({
  name: nonEmptyString,
  shortName: nonEmptyString,
  title: nonEmptyString,
  location: nonEmptyString,
  tagline: nonEmptyString,
  avatar: assetPath,
  phone: nonEmptyString,
  email: z.email(),
  experienceStartDate: isoDate,
  experienceYearsOffset: z.number().int().nonnegative(),
  nameLines: z.array(nonEmptyString).min(1),
  heroRatingTail: nonEmptyString,
});

const navItemSchema = z.strictObject({
  label: nonEmptyString,
  id: nonEmptyString,
  icon: nonEmptyString,
  action: z.enum(NavAction).optional(),
});

const heroCardSchema = z.strictObject({
  caption: nonEmptyString,
  title: nonEmptyString,
  icon: nonEmptyString,
  tint: nonEmptyString,
});

const partnerSchema = z.strictObject({ name: nonEmptyString, logo: assetPath });

const createBandItemSchema = z.strictObject({ text: nonEmptyString, variant: nonEmptyString });

const articleSchema = z.strictObject({
  id: nonEmptyString,
  platform: nonEmptyString,
  title: nonEmptyString,
  href: urlString,
  date: isoDate,
  /** Null for Medium imports, which don't report a reading time. */
  readMin: z.number().int().positive().nullable(),
  excerpt: z.string(),
  tags: z.array(nonEmptyString),
  active: z.boolean(),
});

const serviceSchema = z.strictObject({ title: nonEmptyString, desc: nonEmptyString, icon: nonEmptyString });

const statSchema = z.strictObject({
  value: z.number().int().nonnegative(),
  suffix: z.string(),
  label: nonEmptyString,
  icon: nonEmptyString,
});

const skillGroupSchema = z.strictObject({
  title: nonEmptyString,
  icon: nonEmptyString,
  items: z.array(nonEmptyString).min(1),
});

const educationSchema = z.strictObject({
  startYear: z.number().int(),
  endYear: z.number().int(),
  school: nonEmptyString,
  degreeType: nonEmptyString,
  subject: nonEmptyString,
  place: nonEmptyString,
  logo: assetPath,
  website: urlString,
});

const socialSchema = z.strictObject({ label: nonEmptyString, href: urlString, icon: nonEmptyString });

const companySchema = z.strictObject({
  name: nonEmptyString,
  logo: assetPath,
  location: nonEmptyString,
  color: hexColor,
  website: urlString,
});

const experienceSchema = z.strictObject({
  id: nonEmptyString,
  companySlug: nonEmptyString,
  role: nonEmptyString,
  employmentType: z.enum(EmploymentType),
  period: nonEmptyString,
  summary: nonEmptyString,
  details: z.array(nonEmptyString),
  stacks: z.array(nonEmptyString),
  aiTools: z.array(nonEmptyString),
});

const manifestSchema = z.strictObject({
  name: nonEmptyString,
  short_name: nonEmptyString,
  description: nonEmptyString,
});

export const portfolioShapeSchema = z.strictObject({
  site: siteSchema,
  sections: sectionCopySchema,
  editorialOutbound: z.strictObject({
    eyebrow: nonEmptyString,
    hint: nonEmptyString,
    links: z.array(outboundLinkSchema),
  }),
  profile: profileSchema,
  nav: z.array(navItemSchema),
  heroCards: z.array(heroCardSchema),
  partners: z.array(partnerSchema),
  createBand: z.array(createBandItemSchema),
  articles: z.array(articleSchema),
  services: z.array(serviceSchema),
  stats: z.array(statSchema),
  skills: z.array(skillGroupSchema),
  education: z.array(educationSchema),
  socials: z.array(socialSchema),
  companies: z.record(nonEmptyString, companySchema),
  experiences: z.array(experienceSchema),
  manifest: manifestSchema,
});

function addVocabularyIssue(
  context: z.RefinementCtx,
  path: (string | number)[],
  value: string,
  allowed: readonly string[],
) {
  if (allowed.includes(value)) return;
  context.addIssue({
    code: "custom",
    path,
    message: `"${value}" is not in ui.json vocabulary (${allowed.join(", ")})`,
  });
}

/** Structure comes from the shape above; which values are legal vocabulary comes from ui.json, so adding one is a JSON edit. */
export function createPortfolioSchema(ui: UiConfig) {
  return portfolioShapeSchema.superRefine((portfolio, context) => {
    portfolio.experiences.forEach((experience, index) => {
      if (experience.companySlug in portfolio.companies) return;
      context.addIssue({
        code: "custom",
        path: ["experiences", index, "companySlug"],
        message: `unknown company slug "${experience.companySlug}"`,
      });
    });
    portfolio.articles.forEach((article, index) => {
      addVocabularyIssue(context, ["articles", index, "platform"], article.platform, ui.vocabulary.articlePlatforms);
    });
    portfolio.heroCards.forEach((card, index) => {
      addVocabularyIssue(context, ["heroCards", index, "tint"], card.tint, ui.vocabulary.heroCardTints);
    });
    portfolio.createBand.forEach((item, index) => {
      addVocabularyIssue(context, ["createBand", index, "variant"], item.variant, ui.vocabulary.createBandVariants);
    });
  });
}
