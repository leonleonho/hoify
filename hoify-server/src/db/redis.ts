import IORedis from "ioredis";
import { logger } from "../util/logger.js";

function createConnection(url?: string): IORedis {
  const redisUrl = url ?? process.env.REDIS_URL ?? "redis://localhost:6379/0";

  const redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times: number) {
      const maxRetries = 10;
      if (times > maxRetries) {
        logger.error(`Redis connection failed after ${maxRetries} retries, giving up`);
        return null;
      }
      return Math.min(times * 200, 2000);
    },
  });

  redis.on("error", (err) => {
    logger.error(err, "Redis connection error");
  });

  redis.on("connect", () => {
    logger.info("Redis connected");
  });

  return redis;
}

let connection = createConnection();

/**
 * Replace redis connection with new one at different URL.
 * Used by e2e tests to re-point at fresh test-container Redis.
 */
export function reconnect(url: string): void {
  connection.removeAllListeners("error");
  connection.disconnect(false);
  connection = createConnection(url);
}

export { connection };
