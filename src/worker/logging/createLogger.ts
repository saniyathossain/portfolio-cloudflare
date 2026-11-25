import { LogDriver } from "../../enums/LogDriver";
import { parseLogLevel } from "../../lib/logLevel";
import type { ChannelConfig, LoggingConfig } from "../../types/LoggingConfig";
import { ConsoleChannel } from "./channels/ConsoleChannel";
import { D1Channel, isD1Database } from "./channels/D1Channel";
import { isKvStore, KvChannel } from "./channels/KvChannel";
import { NullChannel } from "./channels/NullChannel";
import { StackChannel } from "./channels/StackChannel";
import type { LogChannel } from "./LogChannel";
import { Logger } from "./Logger";

/** Worker bindings and vars are looked up by (config-defined) name, so the environment is a plain record. */
export type LogEnvironment = Readonly<Record<string, unknown>>;

const MAX_STACK_DEPTH = 5;

interface ChannelBuildContext {
  readonly name: string;
  readonly config: LoggingConfig;
  readonly environment: LogEnvironment;
  readonly depth: number;
}

type ChannelOf<TDriver extends LogDriver> = Extract<ChannelConfig, { driver: TDriver }>;

/** One factory per driver: supporting a new driver means adding a case here, not editing a switch. */
const CHANNEL_FACTORIES: {
  readonly [TDriver in LogDriver]: (config: ChannelOf<TDriver>, context: ChannelBuildContext) => LogChannel;
} = {
  [LogDriver.Stderr]: (config, { name }) => new ConsoleChannel(name, "stderr", config.level, config.maxLevel),
  [LogDriver.Stdout]: (config, { name }) => new ConsoleChannel(name, "stdout", config.level, config.maxLevel),
  [LogDriver.Kv]: (config, { name, environment }) => {
    const binding = environment[config.binding];
    return new KvChannel(name, isKvStore(binding) ? binding : undefined, config.level, {
      keyPrefix: config.keyPrefix,
      ttlSeconds: config.ttlSeconds,
    });
  },
  [LogDriver.D1]: (config, { name, environment }) => {
    const binding = environment[config.binding];
    return new D1Channel(name, isD1Database(binding) ? binding : undefined, config.level, config.table);
  },
  [LogDriver.Stack]: (config, context) =>
    new StackChannel(
      context.name,
      config.channels.map((member) => resolveChannel({ ...context, name: member, depth: context.depth + 1 })),
    ),
  [LogDriver.Null]: (_config, { name }) => new NullChannel(name),
};

function resolveChannel(context: ChannelBuildContext): LogChannel {
  const channelConfig: ChannelConfig | undefined = context.config.channels[context.name];
  if (!channelConfig || context.depth > MAX_STACK_DEPTH) return new NullChannel(context.name);
  const factory = CHANNEL_FACTORIES[channelConfig.driver] as (
    config: ChannelConfig,
    context: ChannelBuildContext,
  ) => LogChannel;
  return factory(channelConfig, context);
}

export interface CreateLoggerInput {
  readonly config: LoggingConfig;
  readonly environment: LogEnvironment;
  readonly actor: string;
  readonly requestId: string;
}

/** `LOG_CHANNEL` (Worker var) overrides the configured default, e.g. `LOG_CHANNEL=stderr` or `silent`. */
export function createLogger(input: CreateLoggerInput): Logger {
  const requested = input.environment["LOG_CHANNEL"];
  const channelName =
    typeof requested === "string" && requested in input.config.channels ? requested : input.config.default;
  const minimumFromEnvironment = parseLogLevel(input.environment["LOG_LEVEL"]);
  const channel = resolveChannel({ name: channelName, config: input.config, environment: input.environment, depth: 0 });

  return new Logger(channel, {
    actor: input.actor,
    requestId: input.requestId,
    includeStackTrace: input.config.includeStackTrace,
    redactedKeys: input.config.redactedKeys,
    maxStringLength: input.config.maxContextStringLength,
    ...(minimumFromEnvironment ? { minimumLevel: minimumFromEnvironment } : {}),
  });
}
