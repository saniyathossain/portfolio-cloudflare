import { describe, expect, it } from "vitest";
import rawSignatures from "../../src/content/clientSignatures.json";
import { DeviceType } from "../../src/enums/DeviceType";
import { clientSignaturesSchema } from "../../src/schemas/clientSignaturesSchema";
import { ACCEPT_CLIENT_HINTS } from "../../src/worker/security/headers";
import { ClientHintsReader } from "../../src/worker/services/ClientHintsReader";
import { ClientProfileService } from "../../src/worker/services/ClientProfileService";
import { NetworkProfileReader } from "../../src/worker/services/NetworkProfileReader";
import { UserAgentParser } from "../../src/worker/services/UserAgentParser";

const signatures = clientSignaturesSchema.parse(rawSignatures);
const parser = new UserAgentParser(signatures);
const service = new ClientProfileService(parser, new ClientHintsReader(), new NetworkProfileReader());

const AGENTS = {
  chromeWindows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  edgeWindows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.51",
  safariMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  safariIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  safariIpad: "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  chromeSamsung: "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  chromeReducedAndroid: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  firefoxLinux: "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
  curl: "curl/8.7.1",
  sqlmap: "sqlmap/1.8 (https://sqlmap.org)",
  googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  headless: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36",
} as const;

describe("clientSignatures.json", () => {
  it("passes its schema and rejects unknown keys / invalid regular expressions", () => {
    expect(() => clientSignaturesSchema.parse({ ...rawSignatures, extra: 1 })).toThrow();
    expect(() => clientSignaturesSchema.parse({ ...rawSignatures, bots: [{ category: "tool", pattern: "(" }] })).toThrow();
  });
});

describe("UserAgentParser", () => {
  it("identifies Chrome on Windows (and Edge before Chrome)", () => {
    expect(parser.parse(AGENTS.chromeWindows)).toMatchObject({ browser: { name: "Chrome", version: "131.0.0.0" }, engine: { name: "Blink" }, os: { name: "Windows", version: "10.0" }, device: { type: DeviceType.Desktop, vendor: "Microsoft" } });
    expect(parser.parse(AGENTS.edgeWindows).browser).toMatchObject({ name: "Edge", version: "131.0.2903.51" });
  });

  it("identifies Apple devices (frozen macOS version, iPhone, iPad)", () => {
    expect(parser.parse(AGENTS.safariMac)).toMatchObject({ browser: { name: "Safari", version: "18.1" }, os: { name: "macOS", version: "10.15.7" }, device: { type: DeviceType.Desktop, vendor: "Apple" } });
    expect(parser.parse(AGENTS.safariIphone)).toMatchObject({ os: { name: "iOS", version: "18.1" }, device: { type: DeviceType.Mobile, vendor: "Apple", model: "iPhone" } });
    expect(parser.parse(AGENTS.safariIpad).device).toMatchObject({ type: DeviceType.Tablet, vendor: "Apple" });
  });

  it("reads the Android model from the User-Agent", () => {
    expect(parser.parse(AGENTS.chromeSamsung)).toMatchObject({ os: { name: "Android", version: "14" }, device: { type: DeviceType.Mobile, vendor: "Samsung", model: "SM-S918B" } });
  });

  it("identifies Firefox on Linux", () => {
    expect(parser.parse(AGENTS.firefoxLinux)).toMatchObject({ browser: { name: "Firefox", version: "133.0" }, engine: { name: "Gecko" }, os: { name: "Linux" } });
  });

  it("classifies bots by category, including the empty User-Agent", () => {
    expect(parser.parse(AGENTS.curl).botCategory).toBe("tool");
    expect(parser.parse(AGENTS.sqlmap).botCategory).toBe("scanner");
    expect(parser.parse(AGENTS.googlebot).botCategory).toBe("search");
    expect(parser.parse(AGENTS.headless).botCategory).toBe("automation");
    expect(parser.parse("").botCategory).toBe("empty-user-agent");
    expect(parser.parse(AGENTS.chromeWindows).botCategory).toBe("");
  });
});

describe("ClientHintsReader", () => {
  it("unquotes values and reads the mobile flag", () => {
    const headers = new Headers({ "Sec-CH-UA-Platform": '"Android"', "Sec-CH-UA-Mobile": "?1", "Sec-CH-UA-Model": '"Pixel 9"', "Sec-CH-UA-Platform-Version": '"15.0.0"' });
    expect(new ClientHintsReader().read(headers)).toMatchObject({ platform: "Android", mobile: true, model: "Pixel 9", platformVersion: "15.0.0" });
  });

  it("reports absent hints as empty / null rather than guessing", () => {
    expect(new ClientHintsReader().read(new Headers())).toMatchObject({ platform: "", mobile: null, model: "" });
  });
});

describe("ClientProfileService", () => {
  const requestWith = (headers: Record<string, string>, cf?: object) => {
    const request = new Request("https://saniyat.com/api/contact", { method: "POST", headers });
    if (cf) Object.defineProperty(request, "cf", { value: cf });
    return request;
  };

  it("fills the reduced Android model and the OS version from Client Hints", () => {
    const profile = service.profile(requestWith({ "User-Agent": AGENTS.chromeReducedAndroid, "Sec-CH-UA-Model": '"Pixel 9"', "Sec-CH-UA-Platform": '"Android"', "Sec-CH-UA-Platform-Version": '"15.0.0"', "Sec-CH-UA-Mobile": "?1" }));
    expect(profile.device).toMatchObject({ type: DeviceType.Mobile, model: "Pixel 9" });
    expect(profile.os).toEqual({ name: "Android", version: "15.0.0" });
  });

  it("drops the reduced model marker when no hint corrects it", () => {
    expect(service.profile(requestWith({ "User-Agent": AGENTS.chromeReducedAndroid })).device.model).toBe("");
  });

  it("marks automation as a bot device and combines Cloudflare network + bot signals", () => {
    const profile = service.profile(
      requestWith(
        { "User-Agent": AGENTS.curl, "CF-Connecting-IP": "2001:db8::1", "CF-IPCountry": "BD", "Accept-Language": "en-US,bn;q=0.8" },
        { asn: 64500, asOrganization: "Example Net", colo: "SIN", city: "Dhaka", tlsVersion: "TLSv1.3", tlsCipher: "AEAD-AES128-GCM-SHA256", httpProtocol: "HTTP/2", clientTcpRtt: 42, botManagement: { score: 2, verifiedBot: false, ja3Hash: "abc", ja4: "t13d" } },
      ),
    );
    expect(profile.device.type).toBe(DeviceType.Bot);
    expect(profile.bot).toMatchObject({ isBot: true, category: "tool", cloudflareScore: 2 });
    expect(profile.network).toMatchObject({ ip: "2001:db8::1", ipVersion: 6, country: "BD", asn: 64500, datacenter: "SIN", city: "Dhaka", tlsVersion: "TLSv1.3", ja3Hash: "abc", ja4: "t13d", clientTcpRttMilliseconds: 42 });
    expect(profile.acceptLanguage).toContain("bn");
  });

  it("summarises the client on one greppable line and describes the request", () => {
    const request = requestWith({ "User-Agent": AGENTS.chromeSamsung, Referer: "https://example.org/", "Sec-Fetch-Site": "cross-site", "CF-Ray": "ray-1" });
    expect(service.summarize(service.profile(request))).toBe("Chrome 131.0.0.0 · Android 14 · mobile Samsung SM-S918B");
    expect(service.describeRequest(request)).toMatchObject({ method: "POST", path: "/api/contact", referer: "https://example.org/", fetchSite: "cross-site", ray: "ray-1" });
  });
});

describe("Accept-CH", () => {
  it("asks for the high-entropy hints used by the security log", () => {
    expect(ACCEPT_CLIENT_HINTS).toContain("Sec-CH-UA-Model");
    expect(ACCEPT_CLIENT_HINTS).toContain("Sec-CH-UA-Platform-Version");
  });
});
