import { toHeaderSafeName } from "../security/contactPayload";

export interface ContactMail {
  readonly from: string;
  readonly to: string;
  readonly name: string;
  readonly email: string;
  readonly project: string;
}

const MIME_LINE_LENGTH = 76;
const FALLBACK_NAME = "Visitor";

/** UTF-8-safe base64 (`btoa` alone only handles latin1). */
export function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Builds a minimal, spec-valid RFC 5322 message. Subject and body are base64 / encoded-word so any unicode a
 * visitor types survives, and every header value derived from visitor input is single-line and header-safe, so
 * nothing the visitor types can add a header (Bcc, extra To…). Reply-To is the visitor so a reply goes straight back.
 */
export function composeContactMail(
  mail: ContactMail,
  messageId: string = crypto.randomUUID(),
  now: Date = new Date(),
): string {
  const safeName = toHeaderSafeName(mail.name) || FALLBACK_NAME;
  const subject = `New portfolio contact — ${safeName}`;
  const body = `Name: ${safeName}\r\nEmail: ${mail.email}\r\n\r\n${mail.project}\r\n`;
  const wrappedBody = encodeBase64Utf8(body).replace(new RegExp(`(.{${MIME_LINE_LENGTH}})`, "g"), "$1\r\n");
  return [
    `From: Portfolio Contact <${mail.from}>`,
    `To: <${mail.to}>`,
    `Reply-To: ${safeName} <${mail.email}>`,
    `Message-ID: <${messageId}@saniyat.com>`,
    `Date: ${now.toUTCString()}`,
    `Subject: =?UTF-8?B?${encodeBase64Utf8(subject)}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrappedBody,
  ].join("\r\n");
}
