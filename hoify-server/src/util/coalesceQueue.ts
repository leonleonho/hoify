import { logger } from "./logger.js";

const DEFAULT_RETRY_MS = 5_000;
const DEFAULT_MAX_FAILURES = 5;

export type CoalesceQueue = {
  schedule: (paths: string[]) => Promise<void>;
};

/**
 * Serialize work over a coalesced path set. Paths are only removed after a
 * successful run; failures leave them in the set and retry with backoff.
 */
export function createCoalesceQueue(options: {
  run: (batch: string[]) => Promise<void>;
  label: string;
  retryDelayMs?: number;
  maxConsecutiveFailures?: number;
}): CoalesceQueue {
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_MS;
  const maxFailures = options.maxConsecutiveFailures ?? DEFAULT_MAX_FAILURES;

  let chain: Promise<void> = Promise.resolve();
  const pending = new Set<string>();
  let consecutiveFailures = 0;

  function schedule(paths: string[]): Promise<void> {
    for (const p of paths) pending.add(p);

    chain = chain
      .then(async () => {
        while (pending.size > 0) {
          const batch = [...pending];
          try {
            await options.run(batch);
            for (const p of batch) pending.delete(p);
            consecutiveFailures = 0;
          } catch (err) {
            consecutiveFailures++;
            logger.error(
              { err, count: batch.length, attempt: consecutiveFailures },
              `${options.label} failed`,
            );

            if (consecutiveFailures >= maxFailures) {
              logger.error(
                { count: batch.length, attempt: consecutiveFailures },
                `${options.label} giving up after repeated failures`,
              );
              for (const p of batch) pending.delete(p);
              consecutiveFailures = 0;
              continue;
            }

            await new Promise((r) => setTimeout(r, retryDelayMs));
          }
        }
      })
      .catch((err) => {
        logger.error(err, `${options.label} chain crashed`);
      });

    return chain;
  }

  return { schedule };
}
