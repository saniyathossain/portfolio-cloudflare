/**
 * Every Worker variable / secret the code reads, in one place. Documented in docs/aidlc/66, `.dev.vars.example` and
 * `wrangler.toml`. Numeric limits override the matching value in src/content/security.json when set and valid.
 */
export enum EnvVar {
  // Contact delivery
  ContactFrom = "CONTACT_FROM",
  ContactTo = "CONTACT_TO",
  ContactRetentionSeconds = "CONTACT_RETENTION_SECONDS",
  // Secrets
  AdminToken = "ADMIN_TOKEN",
  TurnstileSecret = "TURNSTILE_SECRET",
  // Maintenance
  MaintenanceMode = "MAINTENANCE_MODE",
  MaintenanceTitle = "MAINTENANCE_TITLE",
  MaintenanceMessage = "MAINTENANCE_MESSAGE",
  MaintenanceRetryAfterSeconds = "MAINTENANCE_RETRY_AFTER_SECONDS",
  // Real-user Web Vitals (docs/aidlc/69)
  RumEnabled = "RUM_ENABLED",
  MaxVitalsBodyBytes = "MAX_VITALS_BODY_BYTES",
  RateLimitVitalsLimit = "RATE_LIMIT_VITALS_LIMIT",
  RateLimitVitalsWindowSeconds = "RATE_LIMIT_VITALS_WINDOW_SECONDS",
  VitalsRetentionDays = "VITALS_RETENTION_DAYS",
  // Edge behaviour
  AllowEdgeInjection = "ALLOW_EDGE_INJECTION",
  // Logging
  LogChannel = "LOG_CHANNEL",
  LogLevel = "LOG_LEVEL",
  // Request limits
  MaxUrlLength = "MAX_URL_LENGTH",
  MaxContactBodyBytes = "MAX_CONTACT_BODY_BYTES",
  MaxCspReportBytes = "MAX_CSP_REPORT_BYTES",
  MaxNameLength = "MAX_NAME_LENGTH",
  MaxEmailLength = "MAX_EMAIL_LENGTH",
  MaxProjectLength = "MAX_PROJECT_LENGTH",
  // Rate limits (limit = requests per window)
  RateLimitContactLimit = "RATE_LIMIT_CONTACT_LIMIT",
  RateLimitContactWindowSeconds = "RATE_LIMIT_CONTACT_WINDOW_SECONDS",
  RateLimitAdminFailureLimit = "RATE_LIMIT_ADMIN_FAILURE_LIMIT",
  RateLimitAdminFailureWindowSeconds = "RATE_LIMIT_ADMIN_FAILURE_WINDOW_SECONDS",
  RateLimitCspReportLimit = "RATE_LIMIT_CSP_REPORT_LIMIT",
  RateLimitCspReportWindowSeconds = "RATE_LIMIT_CSP_REPORT_WINDOW_SECONDS",
  // Owner read endpoint
  AdminListDefaultLimit = "ADMIN_LIST_DEFAULT_LIMIT",
  AdminListMaxLimit = "ADMIN_LIST_MAX_LIMIT",
}
