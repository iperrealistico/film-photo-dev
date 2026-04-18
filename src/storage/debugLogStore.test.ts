import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createDebugLogEntry } from '../debug/logModel';
import {
  appendDebugEntry,
  clearStoredDebugEntries,
  getStoredDebugLogStats,
  listStoredDebugEntries,
  pruneStoredDebugEntries
} from './debugLogStore';

describe('debug log store', () => {
  it('stores and returns newest entries first', async () => {
    await clearStoredDebugEntries();
    await appendDebugEntry(
      createDebugLogEntry({ category: 'app', event: 'older' }, 1_000),
    );
    await appendDebugEntry(
      createDebugLogEntry({ category: 'app', event: 'newer' }, 2_000),
    );

    const entries = await listStoredDebugEntries(10);

    expect(entries).toHaveLength(2);
    expect(entries[0]?.event).toBe('newer');
  });

  it('prunes older and excess entries', async () => {
    await clearStoredDebugEntries();

    for (let index = 0; index < 6; index += 1) {
      await appendDebugEntry(
        createDebugLogEntry(
          { category: 'runtime', event: `entry_${index}` },
          index * 1_000,
        ),
      );
    }

    const removed = await pruneStoredDebugEntries(8_000, 5_500, 2);
    const entries = await listStoredDebugEntries(10);
    const stats = await getStoredDebugLogStats(2, 5_500);

    expect(removed).toBeGreaterThan(0);
    expect(entries).toHaveLength(2);
    expect(stats.entryCount).toBe(2);
    expect(stats.lastPrunedAt).toBeDefined();
  });
});
