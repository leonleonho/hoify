import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Hoify logger — single pino instance for the whole server.
 *
 * Dev (non-production):
 *   Level defaults to `debug`, output piped through pino-pretty.
 *
 * Production:
 *   Level defaults to `warn`. Pure JSON on stdout.
 *
 * Override level via LOG_LEVEL env var (trace, debug, info, warn, error, silent).
 */
const transport = isProduction
  ? undefined
  : pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l o",
        ignore: "pid,hostname",
      },
    });

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isProduction ? "warn" : "debug"),
  },
  transport,
);
