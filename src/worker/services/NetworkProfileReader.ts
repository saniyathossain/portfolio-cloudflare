import type { NetworkInfo } from "../../types/ClientProfile";

/** The subset of Cloudflare's `request.cf` the security log uses. Fields vary by plan, so everything is optional. */
export interface CloudflareProperties {
  readonly asn?: number;
  readonly asOrganization?: string;
  readonly colo?: string;
  readonly country?: string;
  readonly region?: string;
  readonly city?: string;
  readonly timezone?: string;
  readonly httpProtocol?: string;
  readonly tlsVersion?: string;
  readonly tlsCipher?: string;
  readonly clientTcpRtt?: number;
  readonly botManagement?: {
    readonly score?: number;
    readonly verifiedBot?: boolean;
    readonly ja3Hash?: string;
    readonly ja4?: string;
  };
}

export function cloudflareProperties(request: Request): CloudflareProperties {
  return (request as Request & { cf?: CloudflareProperties }).cf ?? {};
}

function ipVersionOf(ip: string): 4 | 6 | 0 {
  if (ip === "") return 0;
  return ip.includes(":") ? 6 : 4;
}

type Location = Pick<NetworkInfo, "country" | "region" | "city" | "timezone">;
type Carrier = Pick<NetworkInfo, "asn" | "asOrganization" | "datacenter">;
type Transport = Pick<
  NetworkInfo,
  "httpProtocol" | "tlsVersion" | "tlsCipher" | "ja3Hash" | "ja4" | "clientTcpRttMilliseconds"
>;

function locationOf(edge: CloudflareProperties, headerCountry: string): Location {
  return {
    country: headerCountry === "" ? (edge.country ?? "") : headerCountry,
    region: edge.region ?? "",
    city: edge.city ?? "",
    timezone: edge.timezone ?? "",
  };
}

function carrierOf(edge: CloudflareProperties): Carrier {
  return { asn: edge.asn, asOrganization: edge.asOrganization ?? "", datacenter: edge.colo ?? "" };
}

function transportOf(edge: CloudflareProperties): Transport {
  return {
    httpProtocol: edge.httpProtocol ?? "",
    tlsVersion: edge.tlsVersion ?? "",
    tlsCipher: edge.tlsCipher ?? "",
    ja3Hash: edge.botManagement?.ja3Hash ?? "",
    ja4: edge.botManagement?.ja4 ?? "",
    clientTcpRttMilliseconds: edge.clientTcpRtt,
  };
}

/**
 * Network identity of the caller. Note what is NOT here and cannot be: a MAC address never leaves the visitor's local
 * network segment (routers rewrite it), so no website, Worker or CDN can see it; the nearest durable identifiers are
 * the IP + ASN, the TLS fingerprint (JA3/JA4) and the client hints.
 */
export class NetworkProfileReader {
  read(request: Request): NetworkInfo {
    const edge = cloudflareProperties(request);
    const ip = request.headers.get("CF-Connecting-IP") ?? "";
    return {
      ip,
      ipVersion: ipVersionOf(ip),
      ...locationOf(edge, request.headers.get("CF-IPCountry") ?? ""),
      ...carrierOf(edge),
      ...transportOf(edge),
    };
  }
}
