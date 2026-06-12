/**
 * Load a .graphql file as a parsed GraphQL document.
 *
 * Usage in each resolver module:
 *   const typeDefs = loadTypeDefs(import.meta.url, "./typeDefs.graphql");
 */
export declare function loadTypeDefs(importMetaUrl: string, relativePath: string): import("graphql").DocumentNode;
