import { loadTypeDefs } from "../loadTypeDefs.js";
import { resolvers } from "./resolvers.js";

export const typeDefs = loadTypeDefs(import.meta.url, "./typeDefs.graphql");

export { resolvers };
