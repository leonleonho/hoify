import { execSync } from "node:child_process";

const PG_IMAGE = "postgres:16-alpine";
const REDIS_IMAGE = "redis:7-alpine";
const POLL_INTERVAL_MS = 800;
const MAX_RETRIES = 40; // ~32 seconds total

export interface ContainerInfo {
  port: number;
  containerId: string;
}

/**
 * Get the host port Docker mapped for the container's internal port.
 */
function getHostPort(containerId: string, internalPort: number): number {
  const output = execSync(`docker port ${containerId} ${internalPort}`, {
    encoding: "utf-8",
  }).trim();
  // output: "0.0.0.0:54321" or "127.0.0.1:54321"
  const port = parseInt(output.split(":")[1], 10);
  if (isNaN(port)) {
    throw new Error(
      `Could not parse host port from docker port output: ${output}`,
    );
  }
  return port;
}

/**
 * Check that `docker` is available on the system PATH.
 */
function ensureDockerAvailable(): void {
  try {
    execSync("docker info", { stdio: "ignore" });
  } catch {
    throw new Error(
      "Docker is required for e2e tests. Make sure Docker is installed and running.",
    );
  }
}

/**
 * Check if an image is available locally; pull if missing.
 */
async function ensureImage(image: string, label: string): Promise<void> {
  try {
    execSync(`docker image inspect ${image}`, { stdio: "ignore" });
  } catch {
    console.log(`Pulling ${label}...`);
    execSync(`docker pull ${image}`, { stdio: "inherit" });
  }
}

/**
 * Wait until pg_isready succeeds inside the container.
 */
async function waitForPostgres(containerId: string): Promise<void> {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      execSync(
        `docker exec ${containerId} pg_isready -U hoify -d hoify`,
        { stdio: "ignore" },
      );
      return;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  const logs = execSync(`docker logs ${containerId}`).toString();
  throw new Error(
    `Postgres container did not become ready within ${(MAX_RETRIES * POLL_INTERVAL_MS) / 1000}s.\nContainer logs:\n${logs}`,
  );
}

/**
 * Wait until redis-cli ping succeeds inside the container.
 */
async function waitForRedis(containerId: string): Promise<void> {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      execSync(
        `docker exec ${containerId} redis-cli ping`,
        { stdio: "ignore" },
      );
      return;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(
    `Redis container did not become ready within ${(MAX_RETRIES * POLL_INTERVAL_MS) / 1000}s`,
  );
}

/**
 * Start a fresh PostgreSQL 16 container on a dynamically-assigned port.
 * Blocks until the database is ready to accept connections.
 *
 * Returns connection details and a cleanup function.
 */
export async function startContainer(
  options?: {
    user?: string;
    password?: string;
    database?: string;
  },
): Promise<ContainerInfo & { cleanup: () => Promise<void> }> {
  ensureDockerAvailable();
  await ensureImage(PG_IMAGE, "PostgreSQL");

  const user = options?.user ?? "hoify";
  const password = options?.password ?? "hoify_dev";
  const database = options?.database ?? "hoify";
  const containerName = `hoify-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const containerId = execSync(
    `docker run -d \
      --name ${containerName} \
      -e POSTGRES_USER=${user} \
      -e POSTGRES_PASSWORD=${password} \
      -e POSTGRES_DB=${database} \
      -p 0:5432 \
      ${PG_IMAGE}`,
    { encoding: "utf-8" },
  ).trim();

  try {
    await waitForPostgres(containerId);
  } catch (err) {
    execSync(`docker rm -f ${containerId}`, { stdio: "ignore" });
    throw err;
  }

  const port = getHostPort(containerId, 5432);

  const cleanup = async () => {
    try {
      execSync(`docker rm -f ${containerId}`, { stdio: "ignore" });
    } catch {
      // Container already removed — idempotent
    }
  };

  return { port, containerId, cleanup };
}

/**
 * Start a fresh Redis 7 container on a dynamically-assigned port.
 * Blocks until ready to accept connections.
 */
export async function startRedisContainer(): Promise<
  ContainerInfo & { cleanup: () => Promise<void> }
> {
  ensureDockerAvailable();
  await ensureImage(REDIS_IMAGE, "Redis");

  const containerName = `hoify-redis-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const containerId = execSync(
    `docker run -d \
      --name ${containerName} \
      -p 0:6379 \
      ${REDIS_IMAGE}`,
    { encoding: "utf-8" },
  ).trim();

  try {
    await waitForRedis(containerId);
  } catch (err) {
    execSync(`docker rm -f ${containerId}`, { stdio: "ignore" });
    throw err;
  }

  const port = getHostPort(containerId, 6379);

  const cleanup = async () => {
    try {
      execSync(`docker rm -f ${containerId}`, { stdio: "ignore" });
    } catch {
      // Already gone
    }
  };

  return { port, containerId, cleanup };
}

/**
 * Stop and remove a container by its ID.
 */
export async function stopContainer(containerId: string): Promise<void> {
  try {
    execSync(`docker rm -f ${containerId}`, { stdio: "ignore" });
  } catch {
    // Already gone
  }
}
