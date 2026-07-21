import { describe, it, expect } from "@jest/globals";
import { resolve } from "node:path";
import { collapseImportRoots } from "../paths.js";

describe("collapseImportRoots", () => {
  const ingestRoot = resolve("/ingest");

  it("collapses files under a shared parent into the parent when parent is present", () => {
    const album = resolve("/ingest/Album");
    const t1 = resolve("/ingest/Album/01.mp3");
    const t2 = resolve("/ingest/Album/02.mp3");
    expect(collapseImportRoots([album, t1, t2], ingestRoot)).toEqual([album]);
  });

  it("promotes album tracks to their parent folder", () => {
    const t1 = resolve("/ingest/Album/01.mp3");
    const t2 = resolve("/ingest/Album/02.mp3");
    expect(collapseImportRoots([t1, t2], ingestRoot)).toEqual([
      resolve("/ingest/Album"),
    ]);
  });

  it("keeps singleton files directly under ingest root", () => {
    const t1 = resolve("/ingest/a.mp3");
    const t2 = resolve("/ingest/b.mp3");
    expect(collapseImportRoots([t1, t2], ingestRoot).sort()).toEqual(
      [t1, t2].sort(),
    );
  });

  it("dedupes identical paths", () => {
    const p = resolve("/ingest/Album");
    expect(collapseImportRoots([p, p, p], ingestRoot)).toEqual([p]);
  });

  it("drops nested paths under another root", () => {
    const nested = resolve("/ingest/Album/01.mp3");
    expect(collapseImportRoots([ingestRoot, nested], ingestRoot)).toEqual([
      ingestRoot,
    ]);
  });
});
