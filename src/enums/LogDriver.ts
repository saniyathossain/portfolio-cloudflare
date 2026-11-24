/** Where a channel writes. Mirrors Laravel's log channel drivers; add a driver by adding a case + a factory. */
export enum LogDriver {
  Stderr = "stderr",
  Stdout = "stdout",
  Kv = "kv",
  D1 = "d1",
  Stack = "stack",
  Null = "null",
}
