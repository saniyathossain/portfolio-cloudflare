import { ClientHintHeader } from "../../enums/ClientHintHeader";
import type { ClientHintsInfo } from "../../types/ClientProfile";

/** Structured-header strings arrive quoted (`"Android"`); logs want the bare value. */
function unquote(value: string): string {
  return value.replaceAll('"', "").trim();
}

/** Reads the User-Agent Client Hints a browser chose to send. Absent hints are empty strings / null, never guesses. */
export class ClientHintsReader {
  read(headers: Headers): ClientHintsInfo {
    const text = (header: ClientHintHeader) => unquote(headers.get(header) ?? "");
    const mobile = headers.get(ClientHintHeader.Mobile);
    return {
      brands: text(ClientHintHeader.Brands),
      fullVersionList: text(ClientHintHeader.FullVersionList),
      mobile: mobile === null ? null : mobile.trim() === "?1",
      platform: text(ClientHintHeader.Platform),
      platformVersion: text(ClientHintHeader.PlatformVersion),
      model: text(ClientHintHeader.Model),
      architecture: text(ClientHintHeader.Architecture),
      bitness: text(ClientHintHeader.Bitness),
    };
  }
}
