/** UI icon helper — local FA SVGs + inline fallbacks (no runtime npm) */
(function () {
  const FA = "/assets/icons/fa/";

  const map = {
    home: FA + "house.svg",
    experience: FA + "briefcase.svg",
    skills: FA + "screwdriver-wrench.svg",
    education: FA + "graduation-cap.svg",
    contact: FA + "envelope.svg",
    server: FA + "server.svg",
    architecture: FA + "sitemap.svg",
    api: FA + "plug.svg",
    ai: FA + "robot.svg",
    chart: FA + "chart-line.svg",
    building: FA + "building.svg",
    rocket: FA + "rocket.svg",
    users: FA + "users.svg",
    location: FA + "location-dot.svg",
    clock: FA + "clock.svg",
    arrow: FA + "arrow-right.svg",
    external: FA + "arrow-up-right-from-square.svg",
    chevronDown: FA + "chevron-down.svg",
    chevronUp: FA + "chevron-up.svg",
    menu: FA + "bars.svg",
    close: FA + "xmark.svg",
    check: FA + "check.svg",
    star: FA + "star.svg",
    chip: FA + "microchip.svg",
    database: FA + "database.svg",
    cloud: FA + "cloud.svg",
    code: FA + "code.svg",
    layers: FA + "layer-group.svg",
    sparkles: FA + "sparkles.svg",
    pin: FA + "location-crosshairs.svg",
    github: FA + "github.svg",
    linkedin: FA + "linkedin.svg",
    devto: FA + "dev.svg",
    medium: FA + "medium.svg",
    engineer: FA + "code.svg",
    years: FA + "star.svg",
    products: FA + "rocket.svg",
    companies: FA + "building.svg",
    roles: FA + "users.svg",
  };

  window.iconSrc = function (name) {
    return map[name] || map.code;
  };

  /** Build an <img> icon for Alpine / static markup */
  window.iconImg = function (name, className) {
    const src = window.iconSrc(name);
    const cls = className ? ' class="' + className + '"' : "";
    return '<img src="' + src + '" alt="" width="16" height="16" decoding="async" aria-hidden="true"' + cls + ">";
  };
})();
