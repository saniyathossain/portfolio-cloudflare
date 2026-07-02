/** Portfolio content — loaded from /assets/data/portfolio.json */

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
  const bits = [];
  if (years) bits.push(years + (years === 1 ? " year" : " years"));
  if (months) bits.push(months + (months === 1 ? " month" : " months"));
  if (!bits.length) bits.push("1 month");
  return { years, months, totalMonths: total, label: bits.join(", ") };
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

function _applyLoaderCopy(data) {
  const brand = document.getElementById("loader-brand-name");
  const tagline = document.getElementById("loader-tagline");
  if (brand) brand.textContent = data.profile.shortName;
  if (tagline) tagline.textContent = data.profile.tagline;
}

function _webpPath(imagePath) {
  if (!imagePath) return "";
  return String(imagePath).replace(/\.(jpe?g|png)$/i, ".webp");
}

function _applyHeroImages(data) {
  const src = data.profile.avatar;
  const alt = data.profile.name;
  const webp = _webpPath(src);
  const base = document.getElementById("heroBaseImg");
  const brush = document.getElementById("heroBrushImg");
  const webpSource = document.getElementById("heroWebpSource");
  if (base) {
    base.src = src;
    base.alt = alt;
  }
  if (brush) brush.src = src;
  if (webpSource && webp) webpSource.srcset = webp;
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
  data.normalizeRole = _enrichExperience;
  data.experienceGroups = _groupExperiences(data);
  data.profile.phoneHref = String(data.profile.phone || "").replace(/[^\d+]/g, "");
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
    _applyHeroImages(window.PORTFOLIO_DATA);
    window.dispatchEvent(new Event("portfolio-data-ready"));
    return window.PORTFOLIO_DATA;
  });
