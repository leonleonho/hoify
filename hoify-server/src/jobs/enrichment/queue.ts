import { Queue } from "bullmq";
import { connection } from "../../db/redis.js";

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
