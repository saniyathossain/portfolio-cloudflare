/** Where a channel writes. Mirrors Laravel's log channel drivers; add a driver by adding a case + a factory. */
export enum LogDriver {
  Stderr = "stderr",
  Stdout = "stdout",
  Kv = "kv",
  Database = "database",
  Stack = "stack",
  Null = "null",
}
