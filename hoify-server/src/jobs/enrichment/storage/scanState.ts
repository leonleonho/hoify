import { db } from "../../../db/index.js";
import {
  libraryScanState,
  type LibraryScanStatus,
} from "../../../db/schema.js";

export async function recordScanState(
  filePath: string,
  fileMtime: number,
  status: LibraryScanStatus,
): Promise<void> {
  await db
    .insert(libraryScanState)
    .values({ filePath, fileMtime, status })
    .onConflictDoUpdate({
      target: libraryScanState.filePath,
      set: {
        fileMtime,
        status,
        updatedAt: new Date(),
      },
    });
}
