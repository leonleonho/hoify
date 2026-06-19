const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';
const API_BASE = API_URL.replace('/graphql', '');

export function artUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return `${API_BASE}${path}`;
}
