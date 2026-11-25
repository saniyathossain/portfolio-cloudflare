/** Short machine-readable codes returned in `{ error }` by the JSON APIs; details stay in the log, never the response. */
export enum ApiErrorCode {
  MethodNotAllowed = "method_not_allowed",
  BadContentType = "bad_content_type",
  ForbiddenOrigin = "forbidden_origin",
  RateLimited = "rate_limited",
  PayloadTooLarge = "payload_too_large",
  BadJson = "bad_json",
  BadPayload = "bad_payload",
  CaptchaFailed = "captcha_failed",
  Unauthorized = "unauthorized",
}
