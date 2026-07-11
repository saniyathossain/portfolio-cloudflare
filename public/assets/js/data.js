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
  kibana: { icon: "kibana", color: "#005571" },
  rabbitmq: { icon: "rabbitmq", color: "#FF6600" },
  minio: { icon: "minio", color: "#C72E49" },
  mockoon: { icon: "mockoon", color: "#242830" },
  "vs code": { icon: "visualstudiocode", color: "#007ACC" },
  vscode: { icon: "visualstudiocode", color: "#007ACC" },
  "visual studio code": { icon: "visualstudiocode", color: "#007ACC" },
  phpstorm: { icon: "phpstorm", color: "#765AF8" },
  "php storm": { icon: "phpstorm", color: "#765AF8" },
  webstorm: { icon: "webstorm", color: "#00CDD7" },
  "web storm": { icon: "webstorm", color: "#00CDD7" },
  "sublime text": { icon: "sublimetext", color: "#FF9800" },
  sublimetext: { icon: "sublimetext", color: "#FF9800" },
  "sublime merge": { icon: "sublimemerge", color: "#00E6E7" },
  sublimemerge: { icon: "sublimemerge", color: "#00E6E7" },
  jmeter: { icon: "apachejmeter", color: "#D22128" },
  nginx: { icon: "nginx", color: "#009639" },
  docker: { icon: "docker", color: "#2496ED" },
  git: { icon: "git", color: "#F05032" },
  jira: { icon: "jira", color: "#0052CC" },
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
  gemini: { icon: "googlegemini", color: "#9168C0" },
  copilot: { icon: "githubcopilot", color: "#24292E" },
  cursor: { icon: "cursor", color: "#0A0A0A" },
  antigravity: { icon: "antigravity", color: "#3186ff" },
};

// Curated pill-shell hues — macOS Tahoe system palette + site copper/teal/beige, softened for
// glass tiles on --surface. Logo hex stays in `color` (icons); `tint` drives --brand on pills.
const _TAHOE_PILL_TINTS = {
  php: "#7F88DC",
  javascript: "#DDB85A",
  typescript: "#5A96D4",
  go: "#48B8CC",
  golang: "#48B8CC",
  laravel: "#DE6E62",
  lumen: "#D87868",
  nestjs: "#D86A82",
  nest: "#D86A82",
  node: "#52C08A",
  "node.js": "#52C08A",
  nodejs: "#52C08A",
  express: "#5E8A98",
  vue: "#4EB894",
  "vue.js": "#4EB894",
  vuejs: "#4EB894",
  mysql: "#4A9BB0",
  mssql: "#C8706A",
  redis: "#DE7268",
  redisearch: "#DE7268",
  elasticsearch: "#2E8498",
  kibana: "#3A9AAA",
  rabbitmq: "#E0A05C",
  minio: "#CC7480",
  nginx: "#48B878",
  docker: "#52A8E0",
  git: "#D48258",
  jira: "#5288D8",
  microservices: "#C08858",
  mockoon: "#6E929E",
  jmeter: "#CA7070",
  "vs code": "#4A9AD8",
  vscode: "#4A9AD8",
  "visual studio code": "#4A9AD8",
  phpstorm: "#8A7AE8",
  "php storm": "#8A7AE8",
  webstorm: "#4CC0D0",
  "web storm": "#4CC0D0",
  "sublime text": "#E0A858",
  sublimetext: "#E0A858",
  "sublime merge": "#48D0D8",
  sublimemerge: "#48D0D8",
  svn: "#8A9EC0",
  firebase: "#DE8458",
  wordpress: "#4A96B8",
  codeigniter: "#DE7A62",
  joomla: "#5AA0D8",
  jquery: "#4A90C4",
  bootstrap: "#8E7CC8",
  webpack: "#4A92C0",
  parcel: "#D8A868",
  "parcel builder": "#D8A868",
  openstreetmap: "#5AAA78",
  dotenv: "#BE9A62",
  cakephp: "#D87278",
  "kendo ui": "#DE8278",
  kendo: "#DE8278",
  handsontable: "#4A9E72",
  datatables: "#4A84A8",
  highcharts: "#7A82D0",
  uikit: "#5AA8E8",
  elgg: "#7A8E9A",
  "wysiwyg editor": "#8A7AB0",
  "form wizard": "#4A9888",
  claude: "#DE9878",
  chatgpt: "#52B898",
  openai: "#52B898",
  gemini: "#A088D8",
  copilot: "#6078A0",
  cursor: "#5A88D8",
  antigravity: "#5AA0E8",
};

const _SITE_TAUPE = { r: 154 / 255, g: 127 / 255, b: 114 / 255 };
const _SITE_TEAL = { r: 43 / 255, g: 140 / 255, b: 154 / 255 };
const _SITE_VIOLET = { r: 110 / 255, g: 108 / 255, b: 240 / 255 };

function _hexToRgb(hex) {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6) return { r: 0.42, g: 0.42, b: 0.42 };
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

function _rgbToHex(rgb) {
  const to = (c) => Math.round(Math.max(0, Math.min(255, c * 255))).toString(16).padStart(2, "0");
  return "#" + to(rgb.r) + to(rgb.g) + to(rgb.b);
}

function _mixRgb(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function _rgbToHsl(rgb) {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rgb.r) h = ((rgb.g - rgb.b) / d + (rgb.g < rgb.b ? 6 : 0)) / 6;
    else if (max === rgb.g) h = ((rgb.b - rgb.r) / d + 2) / 6;
    else h = ((rgb.r - rgb.g) / d + 4) / 6;
  }
  return { h: h * 360, s, l };
}

function _hslToRgb(hsl) {
  const hue = (((hsl.h % 360) + 360) % 360) / 360;
  if (hsl.s === 0) return { r: hsl.l, g: hsl.l, b: hsl.l };
  const q = hsl.l < 0.5 ? hsl.l * (1 + hsl.s) : hsl.l + hsl.s - hsl.l * hsl.s;
  const p = 2 * hsl.l - q;
  const hue2rgb = (t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return { r: hue2rgb(hue + 1 / 3), g: hue2rgb(hue), b: hue2rgb(hue - 1 / 3) };
}

// Pill tints need more mid-light chroma than raw logo hexes (many marks are near-black or neon-yellow).
// Lift/dampen in HSL, then nudge toward the site's warm beige + sea-teal + Tahoe violet so stack
// rows feel cohesive on the Lumora glass surface.
function _brandUiTint(hex) {
  const hsl = _rgbToHsl(_hexToRgb(hex));
  let { h, s, l } = hsl;

  if (s < 0.1 || l < 0.12) {
    return _rgbToHex(_mixRgb(_hexToRgb(hex), _SITE_TEAL, 0.32));
  }
  if (l < 0.32) {
    l = 0.5;
    s = Math.max(s, 0.42);
  } else if (l > 0.68) {
    l = 0.58;
    s = Math.min(Math.max(s, 0.48), 0.82);
  } else {
    s = Math.min(s * 1.04 + 0.03, 0.86);
    l = Math.min(Math.max(l, 0.44), 0.58);
  }

  return _rgbToHex(_mixRgb(_mixRgb(_hslToRgb({ h, s, l }), _SITE_TAUPE, 0.1), _SITE_VIOLET, 0.04));
}

function _pillTintOf(key, brand, raw) {
  if (brand && brand.tint) return brand.tint;
  if (_TAHOE_PILL_TINTS[key]) return _TAHOE_PILL_TINTS[key];
  return _brandUiTint(raw);
}

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
  _setMeta("property", "og:image", _absUrl(site.url, site.ogImage || "/assets/img/saniyat-hossain.jpg"));
  _setMeta("name", "twitter:card", "summary_large_image");
  _setMeta("name", "twitter:title", site.title);
  _setMeta("name", "twitter:description", site.twitterDescription || site.description);
  _setMeta("name", "twitter:image", _absUrl(site.url, site.ogImage || "/assets/img/saniyat-hossain.jpg"));

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
  editorial: "Notes on backend engineering, published on dev.to and Medium.",
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
    const raw = b ? b.color : "#6b6b6b";
    const color = _pillTintOf(key, b, raw);
    return {
      label: name,
      color,
      raw,
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
  // The "stacks" stat is a curated headline figure (the core backend/frontend/dev-ops stacks),
  // authored directly in portfolio.json — it is deliberately NOT a raw count of every skill/tool
  // (that over-counts: 19 skill items, 40 distinct stacks across roles). Edit its value in the JSON.
  (data.stats || []).forEach((s) => {
    if (s.icon === "years") s.value = years;
    else if (s.icon === "companies") s.value = companiesCount;
  });

  data.partners = _partnersFromExperience(data);
  const expTerms = (data.site && data.site.experienceHighlights) || [];
  data.highlightExp = (text) => _highlightTerms(text, expTerms);
  data.articles = raw.articles || [];
  data.editorialOutbound = raw.editorialOutbound || null;
  if (data.site && data.site.features) {
    data.site.features.flags = data.site.features.flags || {};
    const v = data.site.features.flags.skillsScrollDesign;
    if (v != null && typeof v === "object") {
      data.site.features.flags.skillsScrollDesign = !!v.enabled;
    } else {
      data.site.features.flags.skillsScrollDesign = !!v;
    }
  }
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
