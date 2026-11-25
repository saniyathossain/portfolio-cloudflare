/**
 * Severity ladder for security telemetry. Only `critical` and `high` reach the durable channels (KV / D1, which
 * start at "error"), so a flood of scanner noise cannot evict the records that matter during an incident.
 */
export enum SecuritySeverity {
  Low = "low",
  Medium = "medium",
  High = "high",
  Critical = "critical",
}
