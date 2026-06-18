import { Queue } from "bullmq";
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

export const connection = redis as any;

export const enrichmentQueue = new Queue("enrichment", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});
