import type { DownloadPlugin } from "./types.js";

export async function getEnabledPlugins(
  saveState?: (key: string, data: unknown) => Promise<void>,
): Promise<DownloadPlugin[]> {
  const plugins: DownloadPlugin[] = [];

  if (process.env.SLSKD_ENABLED === "true") {
    const { SlskdPlugin } = await import("./slskd.js");
    const plugin = new SlskdPlugin(
      saveState ?? (async () => {}),
    );
    plugins.push(plugin);
  }

  return plugins;
}
