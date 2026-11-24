/** User-Agent Client Hints request headers (the low-entropy ones are sent always, the rest after `Accept-CH`). */
export enum ClientHintHeader {
  Brands = "Sec-CH-UA",
  FullVersionList = "Sec-CH-UA-Full-Version-List",
  Mobile = "Sec-CH-UA-Mobile",
  Platform = "Sec-CH-UA-Platform",
  PlatformVersion = "Sec-CH-UA-Platform-Version",
  Model = "Sec-CH-UA-Model",
  Architecture = "Sec-CH-UA-Arch",
  Bitness = "Sec-CH-UA-Bitness",
}
