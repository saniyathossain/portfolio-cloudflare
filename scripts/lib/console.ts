/** Artisan-style status lines shared by the build scripts (docs/aidlc/54 §6): a level badge, then the message.
 *  Colour is applied only on a TTY with NO_COLOR unset. */
const ANSI_RESET = "\u001b[0m";
const BADGE_WIDTH = 5;

type BadgeLevel = "INFO" | "DONE" | "WARN" | "ERROR";

const BADGE_COLOURS: Record<BadgeLevel, string> = {
  INFO: "\u001b[44;97m",
  DONE: "\u001b[42;30m",
  WARN: "\u001b[43;30m",
  ERROR: "\u001b[41;97m",
};

function isColourEnabled(stream: NodeJS.WriteStream): boolean {
  return stream.isTTY && process.env["NO_COLOR"] === undefined;
}

function formatLine(level: BadgeLevel, message: string, stream: NodeJS.WriteStream): string {
  const label = level.padStart(BADGE_WIDTH + 1).padEnd(BADGE_WIDTH + 2);
  const badge = isColourEnabled(stream) ? `${BADGE_COLOURS[level]}${label}${ANSI_RESET}` : label;
  return `${badge} ${message}`;
}

export function logInfo(message: string): void {
  console.log(formatLine("INFO", message, process.stdout));
}

export function logDone(message: string): void {
  console.log(formatLine("DONE", message, process.stdout));
}

export function logWarn(message: string): void {
  console.warn(formatLine("WARN", message, process.stderr));
}

export function logError(message: string): void {
  console.error(formatLine("ERROR", message, process.stderr));
}
