import { describe, expect, it } from 'vitest';
import {
  createDebugLogEntry,
  pruneDebugEntries,
  sanitizeDebugValue
} from './logModel';

describe('debug log model', () => {
  it('sanitizes deep and oversized values', () => {
    const sanitized = sanitizeDebugValue({
      longText: 'x'.repeat(400),
      nested: {
        deeper: {
          evenDeeper: {
            tooFar: {
              stop: true
            }
          }
        }
      },
      items: Array.from({ length: 30 }, (_, index) => index)
    }) as Record<string, unknown>;

    expect(String(sanitized.longText)).toContain('chars');
    expect((sanitized.items as unknown[]).length).toBeLessThanOrEqual(21);
    expect(
      JSON.stringify(sanitized),
    ).toContain('Max depth');
  });

  it('creates stable debug entries', () => {
    const entry = createDebugLogEntry(
      {
        category: 'ui',
        event: 'button_clicked',
        detail: {
          control: 'start'
        }
      },
      1_000,
    );

    expect(entry.createdAtMs).toBe(1_000);
    expect(entry.category).toBe('ui');
    expect(entry.level).toBe('info');
  });

  it('prunes by age and max count', () => {
    const entries = Array.from({ length: 6 }, (_, index) =>
      createDebugLogEntry(
        {
          category: 'runtime',
          event: `event_${index}`
        },
        index * 1_000,
      ),
    );

    const result = pruneDebugEntries(entries, 5_500, 4_000, 3);

    expect(result.keptEntries).toHaveLength(3);
    expect(result.removedIds.length).toBe(3);
    expect(result.keptEntries[0].event).toBe('event_3');
  });
});
