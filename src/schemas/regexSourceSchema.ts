import { z } from "zod";

/** A string that compiles as a regular expression — keeps pattern tables in JSON honest at build/test time. */
export const regexSourceSchema = z.string().refine(
  (source) => {
    try {
      new RegExp(source);
      return true;
    } catch {
      return false;
    }
  },
  { error: "not a valid regular expression" },
);
