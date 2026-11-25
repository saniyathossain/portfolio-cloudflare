const TAB = 9;
const LINE_FEED = 10;
const CARRIAGE_RETURN = 13;
const LAST_C0_CONTROL = 31;
const DELETE = 127;

function isControlCode(code: number): boolean {
  return code <= LAST_C0_CONTROL || code === DELETE;
}

function isLineBreakCode(code: number): boolean {
  return code === LINE_FEED || code === CARRIAGE_RETURN || code === 0x2028 || code === 0x2029;
}

export function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => isControlCode(character.codePointAt(0) ?? 0));
}

/** Removes C0 controls and DEL; keeps tab and (optionally) line feeds so multi-line text survives. */
export function stripControlCharacters(value: string, keepNewlines: boolean): string {
  return Array.from(value)
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      if (code === TAB) return true;
      if (keepNewlines && (code === LINE_FEED || code === CARRIAGE_RETURN)) return true;
      return !isControlCode(code);
    })
    .join("");
}

/** Collapses every line break (CR, LF, U+2028/2029) to one space. */
export function collapseLineBreaks(value: string): string {
  return Array.from(value).map((character) => (isLineBreakCode(character.codePointAt(0) ?? 0) ? " " : character)).join("").replace(/ {2,}/g, " ");
}
