import IORedis from "ioredis";
import { logger } from "../util/logger.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379/0";

const redis = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on("error", (err) => {
  logger.error(err, "Redis connection error");
});

redis.on("connect", () => {
  logger.info("Redis connected");
});

export const connection = redis;
