import { z } from "zod";
import { LogDriver } from "../enums/LogDriver";
import { LogLevel } from "../enums/LogLevel";

const levelSchema = z.enum(LogLevel);
const channelNameSchema = z.string().regex(/^[a-z0-9_-]+$/);
const bindingSchema = z.string().regex(/^[A-Z][A-Z0-9_]*$/);

const consoleChannelSchema = <TDriver extends LogDriver.Stderr | LogDriver.Stdout>(driver: TDriver) =>
  z.strictObject({
    driver: z.literal(driver),
    level: levelSchema,
    /** Optional ceiling, so an info-only stream can sit next to a warn-and-up stream. */
    maxLevel: levelSchema.optional(),
  });

const channelSchema = z.discriminatedUnion("driver", [
  consoleChannelSchema(LogDriver.Stderr),
  consoleChannelSchema(LogDriver.Stdout),
  z.strictObject({
    driver: z.literal(LogDriver.Kv),
    level: levelSchema,
    /** Worker binding name of the KV namespace; the channel is a no-op until it is bound. */
    binding: bindingSchema,
    keyPrefix: z.string().min(1),
    ttlSeconds: z.number().int().min(60),
  }),
  z.strictObject({
    driver: z.literal(LogDriver.Database),
    level: levelSchema,
  }),
  z.strictObject({ driver: z.literal(LogDriver.Stack), channels: z.array(channelNameSchema).min(1) }),
  z.strictObject({ driver: z.literal(LogDriver.Null) }),
]);

export const loggingSchema = z
  .strictObject({
    $comment: z.string().optional(),
    /** Channel used when `LOG_CHANNEL` is not set in the Worker environment. */
    default: channelNameSchema,
    includeStackTrace: z.boolean(),
    /** Context keys (case-insensitive) whose values are replaced with "[redacted]". */
    redactedKeys: z.array(z.string().min(1)),
    maxContextStringLength: z.number().int().min(20),
    channels: z.record(channelNameSchema, channelSchema),
  })
  .superRefine((config, context) => {
    if (!(config.default in config.channels)) {
      context.addIssue({ code: "custom", path: ["default"], message: `unknown channel "${config.default}"` });
    }
    for (const [channelName, channel] of Object.entries(config.channels)) {
      if (channel.driver !== LogDriver.Stack) continue;
      for (const member of channel.channels) {
        if (member in config.channels && member !== channelName) continue;
        context.addIssue({
          code: "custom",
          path: ["channels", channelName, "channels"],
          message: `stack member "${member}" is unknown or refers to itself`,
        });
      }
    }
  });
