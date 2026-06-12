import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import cookieParser from "cookie-parser";
import express from "express";
import { typeDefs, resolvers } from "./graphql/schema.js";
import { authPlugin } from "./graphql/auth/plugin.js";
import { resolveAuthContext } from "./util/auth.js";
import streamRouter from "./routes/stream.js";

/**
 * Create and configure the Express + Apollo Server application.
 * Does NOT call app.listen() — the caller controls that.
 * Returns both the Express app and the Apollo server instance
 * so the caller can stop the server gracefully (e.g. in tests).
 */
export async function createApp() {
  const app = express();

  // --- Cookie parsing ---
  app.use(cookieParser());

  // --- Apollo Server (GraphQL) ---
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [authPlugin],
  });
  await server.start();

  app.use(
    "/graphql",
    express.json(),
    expressMiddleware(server, {
      context: async ({ req, res }) => resolveAuthContext({ req, res }),
    }),
  );

  // --- Music streaming ---
  app.use("/stream", streamRouter);

  // --- Landing page: redirect root to the GraphQL playground ---
  app.get("/", (_req, res) => {
    res.redirect("/graphql");
  });

  return { app, server };
}