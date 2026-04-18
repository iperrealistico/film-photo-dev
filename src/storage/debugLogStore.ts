import { openDB } from 'idb';
import type { DebugLogEntry, DebugLogStats } from '../domain/types';
import { pruneDebugEntries } from '../debug/logModel';

const DATABASE_NAME = 'film-dev-debug-db';
const DATABASE_VERSION = 1;
const ENTRY_STORE = 'entries';
const META_STORE = 'meta';
const META_KEY = 'stats';

interface DebugMetaRecord {
  id: string;
  lastPrunedAt?: string;
}

async function openDebugDatabase() {
  return openDB(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(ENTRY_STORE)) {
        database.createObjectStore(ENTRY_STORE, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: 'id' });
      }
    }
  });
}

export async function appendDebugEntry(entry: DebugLogEntry) {
  const database = await openDebugDatabase();
  await database.put(ENTRY_STORE, entry);
}

export async function listStoredDebugEntries(limit = 80) {
  const database = await openDebugDatabase();
  const entries = (await database.getAll(ENTRY_STORE)) as DebugLogEntry[];

  return entries
    .sort((left, right) => right.createdAtMs - left.createdAtMs)
    .slice(0, limit);
}

export async function clearStoredDebugEntries() {
  const database = await openDebugDatabase();
  const transaction = database.transaction([ENTRY_STORE, META_STORE], 'readwrite');
  await transaction.objectStore(ENTRY_STORE).clear();
  await transaction.objectStore(META_STORE).put({
    id: META_KEY,
    lastPrunedAt: new Date().toISOString()
  } satisfies DebugMetaRecord);
  await transaction.done;
}

export async function pruneStoredDebugEntries(
  nowMs = Date.now(),
  maxAgeMs: number,
  maxEntries: number,
) {
  const database = await openDebugDatabase();
  const allEntries = (await database.getAll(ENTRY_STORE)) as DebugLogEntry[];
  const { removedIds } = pruneDebugEntries(allEntries, nowMs, maxAgeMs, maxEntries);

  if (removedIds.length === 0) {
    return 0;
  }

  const transaction = database.transaction([ENTRY_STORE, META_STORE], 'readwrite');

  for (const entryId of removedIds) {
    await transaction.objectStore(ENTRY_STORE).delete(entryId);
  }

  await transaction.objectStore(META_STORE).put({
    id: META_KEY,
    lastPrunedAt: new Date(nowMs).toISOString()
  } satisfies DebugMetaRecord);
  await transaction.done;

  return removedIds.length;
}

export async function getStoredDebugLogStats(
  maxEntries: number,
  maxAgeMs: number,
): Promise<DebugLogStats> {
  const database = await openDebugDatabase();
  const [entries, meta] = await Promise.all([
    database.getAll(ENTRY_STORE) as Promise<DebugLogEntry[]>,
    database.get(META_STORE, META_KEY) as Promise<DebugMetaRecord | undefined>
  ]);
  const sorted = [...entries].sort((left, right) => left.createdAtMs - right.createdAtMs);

  return {
    entryCount: entries.length,
    oldestAt: sorted[0]?.createdAt,
    newestAt: sorted.at(-1)?.createdAt,
    lastPrunedAt: meta?.lastPrunedAt,
    maxEntries,
    maxAgeMs
  };
}
