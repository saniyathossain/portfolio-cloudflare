/**
 * Constant-time string comparison for secrets (admin token). Length is compared normally — leaking the length is
 * not the sensitive part, the content is — then every character is XOR-accumulated so the runtime does not depend
 * on where the first mismatch is.
 */
export function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
