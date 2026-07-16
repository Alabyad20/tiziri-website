/**
 * The Library index — local-first (Product Design §12, Master Plan §1.8).
 *
 * Files on disk are the source of truth; SQLite is the fast index. A Reel is
 * written as a JSON file (the truth) AND upserted into the index; loading reads
 * the indexed path, then MIGRATES + VALIDATES the JSON. This is the "Reel doc
 * round-trips through disk + SQLite" of the P0 Definition of Done.
 *
 * Driver: Node's built-in `node:sqlite` — zero native-build risk, embedded,
 * exactly right for an offline archive. Kept behind the `LibraryIndex` interface
 * so a production driver (e.g. better-sqlite3) or a cloud Postgres backend can be
 * dropped in without touching callers (Master Plan §1.10).
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { uid, slugify } from "@tiziri/shared";
import { migrateReel, type Reel } from "@tiziri/core";

export interface RugInput {
  readonly name: string;
  readonly widthCm: number;
  readonly lengthCm: number;
  /** Which of the seven captures are present (capture-standard §1). */
  readonly captures?: Readonly<Record<string, boolean>>;
}

export interface RugRecord {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly widthCm: number;
  readonly lengthCm: number;
  readonly captures: Readonly<Record<string, boolean>>;
  readonly createdAt: string;
}

export interface LibraryIndex {
  addRug(input: RugInput): RugRecord;
  getRug(id: string): RugRecord | null;
  listRugs(): RugRecord[];
  saveReel(reel: Reel): void;
  loadReel(id: string): Reel | null;
  close(): void;
}

interface RugRow {
  id: string;
  slug: string;
  name: string;
  width_cm: number;
  length_cm: number;
  captures: string;
  created_at: string;
}
interface ReelRow {
  path: string;
}

export function openLibrary(rootDir: string): LibraryIndex {
  mkdirSync(rootDir, { recursive: true });
  const reelsDir = join(rootDir, "reels");
  mkdirSync(reelsDir, { recursive: true });

  const db = new DatabaseSync(join(rootDir, "library.db"));
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS rugs (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      width_cm REAL NOT NULL,
      length_cm REAL NOT NULL,
      captures TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reels (
      id TEXT PRIMARY KEY,
      rug_id TEXT NOT NULL,
      title TEXT NOT NULL,
      path TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const insertRug = db.prepare(
    `INSERT INTO rugs (id, slug, name, width_cm, length_cm, captures, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const selectRug = db.prepare(`SELECT * FROM rugs WHERE id = ?`);
  // Order by insertion (rowid), not created_at — timestamps can collide within a
  // millisecond, which would make "newest first" nondeterministic.
  const selectRugs = db.prepare(`SELECT * FROM rugs ORDER BY rowid DESC`);
  const upsertReel = db.prepare(
    `INSERT INTO reels (id, rug_id, title, path, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       rug_id = excluded.rug_id,
       title = excluded.title,
       path = excluded.path,
       updated_at = excluded.updated_at`,
  );
  const selectReel = db.prepare(`SELECT path FROM reels WHERE id = ?`);

  function rowToRug(r: RugRow): RugRecord {
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      widthCm: r.width_cm,
      lengthCm: r.length_cm,
      captures: JSON.parse(r.captures) as Record<string, boolean>,
      createdAt: r.created_at,
    };
  }

  return {
    addRug(input) {
      const rec: RugRecord = {
        id: uid(),
        slug: slugify(input.name),
        name: input.name,
        widthCm: input.widthCm,
        lengthCm: input.lengthCm,
        captures: input.captures ?? {},
        createdAt: new Date().toISOString(),
      };
      insertRug.run(
        rec.id,
        rec.slug,
        rec.name,
        rec.widthCm,
        rec.lengthCm,
        JSON.stringify(rec.captures),
        rec.createdAt,
      );
      return rec;
    },

    getRug(id) {
      const row = selectRug.get(id) as unknown as RugRow | undefined;
      return row ? rowToRug(row) : null;
    },

    listRugs() {
      return (selectRugs.all() as unknown as RugRow[]).map(rowToRug);
    },

    saveReel(reel) {
      // Disk is the source of truth; write the JSON first, then index it.
      const path = join(reelsDir, `${reel.id}.json`);
      writeFileSync(path, JSON.stringify(reel, null, 2), "utf8");
      upsertReel.run(reel.id, reel.rugId, reel.title, path, reel.updatedAt);
    },

    loadReel(id) {
      const row = selectReel.get(id) as unknown as ReelRow | undefined;
      if (!row) return null;
      const raw = JSON.parse(readFileSync(row.path, "utf8")) as unknown;
      const result = migrateReel(raw);
      if (!result.ok) {
        throw new Error(`reel ${id} failed to load: ${result.error.join("; ")}`);
      }
      return result.value;
    },

    close() {
      db.close();
    },
  };
}
