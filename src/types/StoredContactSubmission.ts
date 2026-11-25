/** A contact submission as persisted (and returned by the owner read endpoint). */
export interface StoredContactSubmission {
  readonly name: string;
  readonly email: string;
  readonly project: string;
  readonly ts: string;
  readonly ip: string;
  readonly country: string;
  readonly asn: number | undefined;
  readonly ua: string;
  readonly ray: string;
}
