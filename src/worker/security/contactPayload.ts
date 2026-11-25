import { collapseLineBreaks, stripControlCharacters } from "../support/controlCharacters";
import type { SecurityConfig } from "../../types/SecurityConfig";

const HEADER_UNSAFE = /[<>"\\]/g;
const EMAIL_PATTERN = /^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/;

export interface ContactSubmission {
  readonly name: string;
  readonly email: string;
  readonly project: string;
  readonly token: string;
  readonly honeypot: string;
}

export type PayloadError = "bad_payload" | "missing_fields" | "too_long" | "bad_email";

export type PayloadResult =
  | { readonly valid: true; readonly submission: ContactSubmission }
  | { readonly valid: false; readonly error: PayloadError; readonly submission?: ContactSubmission };

function readText(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

/** Single-line fields (name, email) may never carry a line break: it is the primitive behind mail-header injection. */
export function toSingleLine(value: string): string {
  return collapseLineBreaks(stripControlCharacters(value, true)).trim();
}

/** The display name that goes into email headers: single line and without characters that can close a header token. */
export function toHeaderSafeName(value: string): string {
  return toSingleLine(value).replace(HEADER_UNSAFE, "").trim();
}

function exceedsLimits(submission: ContactSubmission, config: SecurityConfig): boolean {
  const { limits } = config;
  return (
    submission.name.length > limits.maxNameLength ||
    submission.email.length > limits.maxEmailLength ||
    submission.project.length > limits.maxProjectLength
  );
}

/**
 * Validates an untrusted JSON body into a submission. Non-string values are treated as empty rather than coerced
 * (`String({})` would smuggle "[object Object]" through), and control characters are stripped before length checks.
 */
export function parseContactPayload(body: unknown, config: SecurityConfig): PayloadResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { valid: false, error: "bad_payload" };
  const source = body as Record<string, unknown>;
  const submission: ContactSubmission = {
    name: toSingleLine(readText(source, "name")),
    email: toSingleLine(readText(source, "email")),
    project: stripControlCharacters(readText(source, "project"), true).trim(),
    token: readText(source, "token") || readText(source, "cf-turnstile-response"),
    honeypot: readText(source, config.honeypotField).trim(),
  };
  if (!submission.name || !submission.email || !submission.project) return { valid: false, error: "missing_fields", submission };
  if (exceedsLimits(submission, config)) return { valid: false, error: "too_long", submission };
  if (!EMAIL_PATTERN.test(submission.email)) return { valid: false, error: "bad_email", submission };
  return { valid: true, submission };
}
