/**
 * Portfolio content — loaded from /assets/data/portfolio.json.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */

const BRANDS = {
  php: { icon: "php", color: "#777BB4" },
  javascript: { icon: "javascript", color: "#F7DF1E" },
  typescript: { icon: "typescript", color: "#3178C6" },
  go: { icon: "go", color: "#00ADD8" },
  golang: { icon: "go", color: "#00ADD8" },
  laravel: { icon: "laravel", color: "#FF2D20" },
  lumen: { icon: "lumen", color: "#E74430" },
  nestjs: { icon: "nestjs", color: "#E0234E" },
  nest: { icon: "nestjs", color: "#E0234E" },
  node: { icon: "nodedotjs", color: "#5FA04E" },
  "node.js": { icon: "nodedotjs", color: "#5FA04E" },
  nodejs: { icon: "nodedotjs", color: "#5FA04E" },
  express: { icon: "express", color: "#3B4A54" },
  vue: { icon: "vuedotjs", color: "#42B883" },
  "vue.js": { icon: "vuedotjs", color: "#42B883" },
  vuejs: { icon: "vuedotjs", color: "#42B883" },
  mysql: { icon: "mysql", color: "#4479A1" },
  mssql: { icon: "mssql", color: "#CC2927" },
  redis: { icon: "redis", color: "#FF4438" },
  redisearch: { icon: "redis", color: "#FF4438" },
  elasticsearch: { icon: "elasticsearch", color: "#005571" },
  kibana: { icon: "kibana", color: "#00A3E0" },
  rabbitmq: { icon: "rabbitmq", color: "#FF6600" },
  minio: { icon: "minio", color: "#C72E49" },
  mockoon: { icon: "mockoon", color: "#1997E8" },
  jmeter: { icon: "apachejmeter", color: "#D22128" },
  nginx: { icon: "nginx", color: "#009639" },
  docker: { icon: "docker", color: "#2496ED" },
  git: { icon: "git", color: "#F05032" },
  svn: { icon: "subversion", color: "#809CC9" },
  firebase: { icon: "firebase", color: "#DD2C00" },
  wordpress: { icon: "wordpress", color: "#21759B" },
  codeigniter: { icon: "codeigniter", color: "#EF4223" },
  joomla: { icon: "joomla", color: "#5091CD" },
  jquery: { icon: "jquery", color: "#0769AD" },
  bootstrap: { icon: "bootstrap", color: "#7952B3" },
  webpack: { icon: "webpack", color: "#1C78C0" },
  parcel: { icon: "parcel", color: "#E7A03C" },
  "parcel builder": { icon: "parcel", color: "#E7A03C" },
  openstreetmap: { icon: "openstreetmap", color: "#578f4a" },
  dotenv: { icon: "dotenv", color: "#a08800" },
  cakephp: { icon: "cakephp", color: "#D33C43" },
  "kendo ui": { icon: "kendo", color: "#FF6358" },
  kendo: { icon: "kendo", color: "#FF6358" },
  handsontable: { icon: "handsontable", color: "#166b45" },
  datatables: { icon: "datatables", color: "#1f5a86" },
  highcharts: { icon: "highcharts", color: "#5c63c9" },
  uikit: { icon: "uikit", color: "#2396F3" },
  elgg: { icon: "elgg", color: "#3a3a3a" },
  microservices: { icon: "microservices", color: "#97501f" },
  "wysiwyg editor": { icon: "wysiwyg-editor", color: "#6b5b95" },
  "form wizard": { icon: "form-wizard", color: "#2f7a6b" },
  claude: { icon: "claude", color: "#D97757" },
  chatgpt: { icon: "openai", color: "#10A37F" },
  openai: { icon: "openai", color: "#10A37F" },
  gemini: { icon: "googlegemini", color: "#7c60a6" },
  copilot: { icon: "githubcopilot", color: "#24292E" },
  cursor: { icon: "cursor", color: "#0A0A0A" },
  antigravity: { icon: "antigravity", color: "#3186ff" },
};

// WCAG relative luminance → pick a readable foreground for a brand color chip. app.js's
// setupHeroContrast samples a hero photo pixel with the same 0.2126/0.7152/0.0722 weights, minus
// the gamma-linearization step below (not worth the cost for a per-frame heuristic there).
function _readableFg(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? "#111111" : "#ffffff";
}

const _MONTH_IDX = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function _parseMonthYear(str) {
  const m = String(str || "").trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!m) return null;
  const mo = _MONTH_IDX[m[1].toLowerCase().slice(0, 3)];
  if (mo === undefined) return null;
  return new Date(parseInt(m[2], 10), mo, 1);
}

function _cleanRoleTitle(role) {
  return String(role || "").replace(/\s*[—–-]?\s*\((Contract|Permanent)\)\s*/gi, "").trim();
}

function _employmentOf(exp) {
  const type = exp.employmentType
    || (/\(Contract\)/i.test(exp.role) ? "contract" : "permanent");
  if (type === "contract") {
    return { type: "contract", label: "Contract", icon: "contract" };
  }
  return { type: "permanent", label: "Permanent", icon: "permanent" };
}

function _enrichExperience(exp) {
  return Object.assign({}, exp, {
    roleDisplay: _cleanRoleTitle(exp.role),
    employment: _employmentOf(exp),
  });
}

function _groupExperiences(data) {
  const groups = [];
  const map = new Map();
  for (const exp of data.experiences) {
    const row = _enrichExperience(exp);
    const co = data.companies[exp.companySlug];
    if (!map.has(exp.companySlug)) {
      const g = {
        slug: exp.companySlug,
        company: co?.name || exp.companySlug,
        logo: co?.logo,
        location: co?.location,
        color: co?.color,
        website: co?.website,
        roles: [],
      };
      map.set(exp.companySlug, g);
      groups.push(g);
    }
    map.get(exp.companySlug).roles.push(row);
  }
  for (const g of groups) {
    g.companyTenure = _companyTenureOf(g.roles);
  }
  return groups;
}

function _formatTenureMonths(total) {
  if (total < 1) total = 1;
  const years = Math.floor(total / 12);
  const months = total % 12;
  const yearStr = years + (years === 1 ? " year" : " years");
  const monthStr = months + (months === 1 ? " month" : " months");
  // Show the leftover months alongside the years when there is a remainder ("5 years 3 months") so
  // the duration is precise; an exact multiple of 12 stays years-only ("2 years"); a genuinely
  // sub-year tenure (some shorter contract stints) shows months only rather than a misleading
  // "1 year" or a meaningless "0 years".
  const label = years >= 1
    ? (months > 0 ? yearStr + " " + monthStr : yearStr)
    : monthStr;
  return { years, months, totalMonths: total, label };
}

function _tenureOf(period) {
  const parts = String(period || "").split(/\s*[—–-]\s*/);
  if (parts.length < 2) return { years: 0, months: 0, totalMonths: 0, label: "—" };
  const start = _parseMonthYear(parts[0]);
  const endRaw = parts[1].trim();
  const end = /^present$/i.test(endRaw) ? new Date() : _parseMonthYear(endRaw);
  if (!start || !end) return { years: 0, months: 0, totalMonths: 0, label: "—" };
  let total = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return _formatTenureMonths(total);
}

// Education dates are year-precision only (startYear/endYear, not month-level like experience's
// "period" strings) — so the duration shown in its tenure popover is years-only, deliberately
// omitting a months breakdown that the underlying data doesn't actually support to that precision.
function _eduTenureOf(startYear, endYear) {
  const years = Math.max(1, (parseInt(endYear, 10) || 0) - (parseInt(startYear, 10) || 0));
  return { years, label: years + (years === 1 ? " year" : " years") };
}

function _companyTenureOf(roles) {
  let totalMonths = 0;
  for (const role of roles || []) {
    totalMonths += _tenureOf(role.period).totalMonths;
  }
  if (!totalMonths) return { years: 0, months: 0, totalMonths: 0, label: "—" };
  return _formatTenureMonths(totalMonths);
}

function _setMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function _absUrl(siteUrl, path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return String(siteUrl || "").replace(/\/$/, "") + path;
}

function _applySiteMeta(data) {
  const { site, profile, socials } = data;
  document.title = site.title;
  _setMeta("name", "description", site.description);
  _setMeta("name", "author", profile.name);
  _setMeta("name", "keywords", site.keywords);
  _setMeta("name", "theme-color", site.themeColor);
  _setMeta("property", "og:type", "website");
  _setMeta("property", "og:url", _absUrl(site.url, "/"));
  _setMeta("property", "og:title", site.title);
  _setMeta("property", "og:description", site.ogDescription || site.description);
  _setMeta("property", "og:image", _absUrl(site.url, site.ogImage || "/assets/img/og-image.jpg"));
  _setMeta("name", "twitter:card", "summary_large_image");
  _setMeta("name", "twitter:title", site.title);
  _setMeta("name", "twitter:description", site.twitterDescription || site.description);
  _setMeta("name", "twitter:image", _absUrl(site.url, site.ogImage || "/assets/img/og-image.jpg"));

  const canon = document.querySelector('link[rel="canonical"]');
  if (canon) canon.href = _absUrl(site.url, "/");

  const ld = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    alternateName: profile.shortName + " Hossain",
    jobTitle: profile.title,
    url: site.url,
    image: _absUrl(site.url, profile.avatar),
    email: "mailto:" + profile.email,
    sameAs: (socials || []).map((s) => s.href),
  };
  let script = document.getElementById("ld-person");
  if (!script) {
    script = document.createElement("script");
    script.id = "ld-person";
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(ld);
}

function _partnersFromExperience(data) {
  // Color now lives on each company entry in portfolio.json (data.companies[slug].color), not a
  // hardcoded map here — editing a partner's color is a JSON change, not a code change. Monochrome
  // by design (every company currently set to the same neutral, matching --muted in styles.css) so
  // the row reads as a calm, premium dock — differentiation comes from each company's own logo, not
  // from assigning it an arbitrary color. (A prior hue-spread palette was technically distinct but
  // read as a "rainbow of bubbles," mismatched with the site's restrained accent-color discipline.)
  // Falls back to the same neutral for any company entry that omits "color".
  const seen = new Set();
  const partners = [];
  for (const group of data.experienceGroups || []) {
    if (seen.has(group.slug)) continue;
    seen.add(group.slug);
    partners.push({
      name: group.company,
      logo: group.logo,
      slug: group.slug,
      color: group.color || "#8d8d8d",
      website: group.website,
    });
  }
  return partners.length ? partners : data.partners || [];
}

function _applyLoaderCopy(data) {
  const brand = document.getElementById("loader-brand-name");
  const tagline = document.getElementById("loader-tagline");
  if (brand) brand.textContent = data.profile.shortName;
  if (tagline) tagline.textContent = data.profile.tagline;
}

const DEFAULT_SECTIONS = {
  services: "Backend, architecture, APIs, and AI-assisted delivery.",
  experience: "{years}+ years · {roles} roles across {companies} companies.",
  skills: "Languages, frameworks, data, platform, and AI in the flow.",
  education: "Electronics & Telecommunication Engineering — Dhaka.",
};

// Whole calendar years elapsed since a career-start date, minus a configurable offset — the
// same "completed years" math as a birthday/age calculation (a naive
// now.getFullYear() - start.getFullYear() overcounts by 1 for any month/day before the
// anniversary has passed this year). The offset exists because "years of experience" is
// sometimes rounded down deliberately (e.g. to exclude a probation period, or just to understate
// it) — set profile.experienceYearsOffset in portfolio.json rather than hand-editing the
// displayed number every time the real elapsed time changes.
function _yearsSince(dateStr, offset) {
  const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return 0;
  const start = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const monthDiff = now.getMonth() - start.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < start.getDate())) years--;
  return Math.max(0, years - (parseInt(offset, 10) || 0));
}

// Fill {years}/{roles}/{companies} placeholders in a template string — used for both
// sections.experience (live, per page load) and, separately, sync-head.js's build-time
// ogDescription (same placeholder syntax, different runtime, no shared module between the two).
function _fillTemplate(str, vars) {
  return String(str || "").replace(/\{(\w+)\}/g, (_, key) => (key in vars ? vars[key] : "{" + key + "}"));
}

function _applySectionSubs(data) {
  const sections = data.sections || DEFAULT_SECTIONS;
  document.querySelectorAll("[data-sec-sub]").forEach((el) => {
    const key = el.getAttribute("data-sec-sub");
    const copy = sections[key] || DEFAULT_SECTIONS[key] || "";
    if (copy) el.textContent = copy;
  });
}

// Escape first, then wrap matches — the escaping has to happen before matching so a term like
// "Node.js" can't accidentally match inside an already-escaped entity, and so the highlighted
// output is safe to inject via x-html regardless of what's in the source text (this is config-
// authored keyword text, not third-party input, but the escape-before-highlight order is what
// makes that distinction not matter).
function _escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function _escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// Longest-first so a multi-word/longer term (e.g. "Node.js") is matched whole before a shorter
// term that happens to be its prefix would otherwise claim part of it.
function _highlightTerms(text, terms) {
  const escaped = _escapeHtml(text || "");
  if (!terms || !terms.length) return escaped;
  const sorted = terms.slice().sort((a, b) => b.length - a.length).map(_escapeRegex);
  const re = new RegExp("(" + sorted.join("|") + ")", "gi");
  return escaped.replace(re, '<strong class="exp-highlight">$1</strong>');
}

function _applyHeroImages(data) {
  // The hero <picture> markup already ships the correct responsive srcset (built by
  // scripts/optimize-images.js) hard-coded in index.html — this only needs to sync `alt` from the
  // data source. Overwriting src/srcset here would replace the responsive set with a single
  // full-size fallback and reintroduce the mobile LCP regression that fix was for.
  const alt = data.profile.name;
  const base = document.getElementById("heroBaseImg");
  if (base) base.alt = alt;
}

function _hydrate(raw) {
  const data = Object.assign({}, raw);
  data.site.year = new Date().getFullYear();
  data.brands = BRANDS;
  data.brandOf = (name) => {
    const key = String(name || "").toLowerCase().trim();
    const b = data.brands[key] || null;
    const color = b ? b.color : "#6b6b6b";
    return {
      label: name,
      color,
      src: b && b.icon ? "/assets/img/brands/" + b.icon + ".svg" : null,
      mono: String(name || "?").trim().charAt(0).toUpperCase(),
      fg: _readableFg(color),
    };
  };
  data.tenureOf = _tenureOf;
  data.companyTenureOf = _companyTenureOf;
  data.eduTenureOf = (e) => _eduTenureOf(e.startYear, e.endYear);
  data.normalizeRole = _enrichExperience;
  data.experienceGroups = _groupExperiences(data);
  data.profile.phoneHref = String(data.profile.phone || "").replace(/[^\d+]/g, "");

  // Years of experience, roles, and companies are all derived here rather than hand-maintained as
  // separate strings scattered across the JSON — every place that cites "N years"/"N roles"/"N
  // companies" reads from these same three numbers, so they can't silently drift out of sync with
  // each other or with the actual experiences array as roles are added over time.
  const years = _yearsSince(data.profile.experienceStartDate, data.profile.experienceYearsOffset);
  const rolesCount = (data.experiences || []).length;
  const companiesCount = data.experienceGroups.length;
  data.profile.years = years + "+";
  data.profile.heroRating = data.profile.years + " years · " + (data.profile.heroRatingTail || "");
  data.sections = Object.assign({}, DEFAULT_SECTIONS, raw.sections || {});
  const tplVars = { years, roles: rolesCount, companies: companiesCount };
  data.sections.experience = _fillTemplate(data.sections.experience, tplVars);
  if (data.site && data.site.aboutHeading) {
    data.site.aboutHeading = _fillTemplate(data.site.aboutHeading, tplVars);
  }
  // Same reasoning as the experience subtitle above — this used to be a hand-typed string
  // duplicating education[0]'s own subject/place fields, which could silently go stale if the
  // highest degree ever changed without someone remembering to update this separate copy too.
  const topEdu = (data.education || [])[0];
  if (topEdu) {
    const city = String(topEdu.place || "").split(",")[0].trim();
    data.sections.education = topEdu.subject + (city ? " — " + city : "") + ".";
  }
  (data.stats || []).forEach((s) => {
    if (s.icon === "years") s.value = years;
    else if (s.icon === "companies") s.value = companiesCount;
  });

  data.partners = _partnersFromExperience(data);
  const expTerms = (data.site && data.site.experienceHighlights) || [];
  data.highlightExp = (text) => _highlightTerms(text, expTerms);
  return data;
}

window.PORTFOLIO_DATA = null;

window.portfolioDataReady = fetch("/assets/data/portfolio.json")
  .then((r) => {
    if (!r.ok) throw new Error("portfolio.json " + r.status);
    return r.json();
  })
  .then((raw) => {
    window.PORTFOLIO_DATA = _hydrate(raw);
    _applySiteMeta(window.PORTFOLIO_DATA);
    _applyLoaderCopy(window.PORTFOLIO_DATA);
    _applySectionSubs(window.PORTFOLIO_DATA);
    _applyHeroImages(window.PORTFOLIO_DATA);
    window.dispatchEvent(new Event("portfolio-data-ready"));
    return window.PORTFOLIO_DATA;
  });
