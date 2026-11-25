import type { z } from "zod";
import type { databaseSchema } from "../schemas/databaseSchema";

export type DatabaseConfig = z.infer<typeof databaseSchema>;
export type ConnectionConfig = DatabaseConfig["connections"][string];
