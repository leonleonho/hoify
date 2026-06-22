import { Queue, type ConnectionOptions } from "bullmq";
import { connection as redisConnection } from "../../db/redis.js";

export { redisConnection as connection };

function createQueue(): Queue {
  return new Queue("music-request", {
    connection: redisConnection as ConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });
}

let _queue: Queue | undefined;

/**
 * Lazily get the music request queue.
 * BullMQ Queue constructor connects eagerly, so defer until first use.
 */
export function getMusicRequestQueue(): Queue {
  if (!_queue) {
    _queue = createQueue();
  }
  return _queue;
}

/**
 * Replace the underlying redis client on the cached queue.
 * Used by e2e tests after reconnect.
 */
export async function replaceRedisClient(): Promise<void> {
  if (_queue) {
    await _queue.close();
    _queue = undefined;
  }
  // Recreate queue with new connection when next accessed
}
