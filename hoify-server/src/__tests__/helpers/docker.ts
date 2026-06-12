import { execSync, exec } from "node:child_process";
import { createServer } from "node:net";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const IMAGE = "postgres:16-alpine";
const POLL_INTERVAL_MS = 800;
const MAX_RETRIES = 40; // ~32 seconds total

export interface ContainerInfo {
  port: number;
  containerId: string;
}

/**
 * Find a free TCP port by binding a server on port 0.
 */
async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        server.close(() => reject(new Error("Could not determine free port")));
        return;
      }
      const port = addr.port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
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
 * Check if the postgres:16-alpine image is available locally.
 * Pull it if missing.
 */
async function ensureImage(): Promise<void> {
  try {
    execSync(`docker image inspect ${IMAGE}`, { stdio: "ignore" });
  } catch {
    console.log(`Pulling ${IMAGE}...`);
    execSync(`docker pull ${IMAGE}`, { stdio: "inherit" });
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

  // Timed out — capture logs for debugging
  const logs = execSync(`docker logs ${containerId}`).toString();
  throw new Error(
    `Postgres container did not become ready within ${(MAX_RETRIES * POLL_INTERVAL_MS) / 1000}s.\nContainer logs:\n${logs}`,
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
  await ensureImage();

  const user = options?.user ?? "hoify";
  const password = options?.password ?? "hoify_dev";
  const database = options?.database ?? "hoify";
  const port = await findFreePort();
  const containerName = `hoify-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const containerId = execSync(
    `docker run -d \
      --name ${containerName} \
      -e POSTGRES_USER=${user} \
      -e POSTGRES_PASSWORD=${password} \
      -e POSTGRES_DB=${database} \
      -p ${port}:5432 \
      ${IMAGE}`,
    { encoding: "utf-8" },
  ).trim();

  try {
    await waitForPostgres(containerId);
  } catch (err) {
    // Cleanup on failure
    execSync(`docker rm -f ${containerId}`, { stdio: "ignore" });
    throw err;
  }

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
 * Stop and remove a container by its ID.
 */
export async function stopContainer(containerId: string): Promise<void> {
  try {
    execSync(`docker rm -f ${containerId}`, { stdio: "ignore" });
  } catch {
    // Already gone
  }
}