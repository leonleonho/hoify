export function isSlskdEnabled(): boolean {
  return process.env.SLSKD_ENABLED === "true";
}

function baseUrl(): string {
  return process.env.SLSKD_URL ?? "http://localhost:5030";
}

function apiKey(): string | undefined {
  return process.env.SLSKD_API_KEY;
}

export async function apiFetch<T>(
  urlPath: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const key = apiKey();
  if (key) {
    headers["X-API-Key"] = key;
  }
  const res = await fetch(`${baseUrl()}${urlPath}`, {
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
