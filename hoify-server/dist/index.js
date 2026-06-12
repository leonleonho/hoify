import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import cors from "cors";
import express from "express";
import { typeDefs, resolvers } from "./graphql/schema.js";
import streamRouter from "./routes/stream.js";
const PORT = parseInt(process.env.PORT ?? "4000", 10);
async function start() {
    const app = express();
    // --- Apollo Server (GraphQL) ---
    const server = new ApolloServer({
        typeDefs,
        resolvers,
    });
    await server.start();
    // Dispatch by method: GET → GraphQL explorer, POST → GraphQL API
    // We define a raw handler BEFORE expressMiddleware to intercept GETs
    app.use("/graphql", cors(), express.json());
    // Intercept GET requests before they reach Apollo
    app.use("/graphql", (req, res, next) => {
        if (req.method !== "GET")
            return next();
        res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>hoify — GraphQL Explorer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #sandbox { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="sandbox" />
  <script src="https://embeddable-sandbox.cdn.apollographql.com/_latest/embeddable-sandbox.umd.production.min.js"></script>
  <script>
    new window.EmbeddedSandbox({
      target: "#sandbox",
      initialEndpoint: window.location.origin + "/graphql",
    });
  </script>
</body>
</html>`);
    });
    // Apollo middleware handles POST (and any other) requests
    app.use("/graphql", expressMiddleware(server));
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
    });
}
start().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map