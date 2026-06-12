import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import gql from "graphql-tag";

/**
 * Load a .graphql file as a parsed GraphQL document.
 *
 * Usage in each resolver module:
 *   const typeDefs = loadTypeDefs(import.meta.url, "./typeDefs.graphql");
 */
export function loadTypeDefs(importMetaUrl: string, relativePath: string) {
  const __filename = fileURLToPath(importMetaUrl);
  const __dirname = dirname(__filename);
  const content = readFileSync(resolve(__dirname, relativePath), "utf-8");
  return gql`
    ${content}
  `;
}