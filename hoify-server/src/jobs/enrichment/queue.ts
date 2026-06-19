import { Queue, type ConnectionOptions } from "bullmq";
import { connection as redisConnection } from "../../db/redis.js";

const connection = redisConnection as ConnectionOptions;

export { connection };

export const enrichmentQueue = new Queue("enrichment", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});
