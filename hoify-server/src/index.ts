import "dotenv/config";
import { client } from "./db/index.js";
import { createApp } from "./app.js";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

async function start() {
  const { app } = await createApp();

  app.listen(PORT, () => {
    console.log(`🚀 hoify-server ready at http://localhost:${PORT}`);
    console.log(`📡 GraphQL at http://localhost:${PORT}/graphql`);
    console.log(`🎵 Streaming at http://localhost:${PORT}/stream/:trackId`);
    console.log(`📦 Database connected`);
  });
}

// ── Graceful shutdown ──────────────────────────────────────────────────────
process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  await client.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down...");
  await client.end();
  process.exit(0);
});

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});