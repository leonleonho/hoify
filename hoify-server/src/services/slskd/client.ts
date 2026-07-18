const SLSKD_URL = process.env.SLSKD_URL ?? "http://localhost:5030";
const SLSKD_API_KEY = process.env.SLSKD_API_KEY;

export function isSlskdEnabled(): boolean {
  return process.env.SLSKD_ENABLED === "true";
}

export async function apiFetch<T>(
  urlPath: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (SLSKD_API_KEY) {
    headers["X-API-Key"] = SLSKD_API_KEY;
  }
  const res = await fetch(`${SLSKD_URL}${urlPath}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`slskd API ${res.status} for ${urlPath}: ${text}`);
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
