import type { z } from "zod";
import type { portfolioShapeSchema } from "../schemas/portfolioSchema";

/** The validated content document — every shape below is inferred from the Zod schema, never hand-written. */
export type Portfolio = z.infer<typeof portfolioShapeSchema>;
export type Site = Portfolio["site"];
export type Profile = Portfolio["profile"];
export type Experience = Portfolio["experiences"][number];
export type Company = Portfolio["companies"][string];
export type Article = Portfolio["articles"][number];
export type Stat = Portfolio["stats"][number];
export type Education = Portfolio["education"][number];
