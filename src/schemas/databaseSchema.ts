import { z } from "zod";
import { DatabaseDriver } from "../enums/DatabaseDriver";

const connectionNameSchema = z.string().regex(/^[a-z0-9_-]+$/);
const bindingSchema = z.string().regex(/^[A-Z][A-Z0-9_]*$/);

const connectionSchema = z.discriminatedUnion("driver", [
  z.strictObject({
    driver: z.literal(DatabaseDriver.D1),
    /** Worker binding name of the D1 database; the connection is a no-op until it is bound. */
    binding: bindingSchema,
  }),
  z.strictObject({ driver: z.literal(DatabaseDriver.Null) }),
]);

export const databaseSchema = z
  .strictObject({
    $comment: z.string().optional(),
    /** Connection used when `DB_CONNECTION` is not set in the Worker environment. */
    default: connectionNameSchema,
    connections: z.record(connectionNameSchema, connectionSchema),
  })
  .superRefine((config, context) => {
    if (config.default in config.connections) return;
    context.addIssue({
      code: "custom",
      path: ["default"],
      message: `default connection "${config.default}" is not defined`,
    });
  });
