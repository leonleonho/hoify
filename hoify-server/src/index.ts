import "dotenv/config";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import cors from "cors";
import express from "express";
import { typeDefs, resolvers } from "./graphql/schema.js";
import streamRouter from "./routes/stream.js";
import { client } from "./db/index.js";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

async function start() {
  const app = express();

  // --- Apollo Server (GraphQL) ---
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });
  await server.start();

  // Apollo middleware handles POST (and any other) requests
  app.use("/graphql", express.json(), expressMiddleware(server));

  // --- Music streaming ---
  app.use("/stream", streamRouter);

  // --- Landing page: redirect root to the GraphQL playground ---
  app.get("/", (_req, res) => {
    res.redirect("/graphql");
  });

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