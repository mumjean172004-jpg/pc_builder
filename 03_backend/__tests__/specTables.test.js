/**
 * Unit tests for services/specTables.js — the typed spec-table registry (Product-Centric)
 */

const { assembleSpecs, upsertSpecs, hasSpecTable } = require('../services/specTables');

function makeFakePool() {
  const specCpuRows = {}; // product_id -> row

  return {
    specCpuRows,
    query: jest.fn(async (sql, params) => {
      if (sql.startsWith('INSERT INTO spec_cpu')) {
        const columns = sql.match(/INSERT INTO spec_cpu \(([^)]+)\)/)[1].split(',').map(c => c.trim());
        const row = {};
        columns.forEach((col, i) => { row[col] = params[i]; });
        specCpuRows[row.product_id] = row;
        return { rows: [], insertId: null };
      }
      if (sql.includes('FROM spec_cpu')) {
        const row = specCpuRows[params[0]];
        if (!row) return { rows: [] };
        return { rows: [{ socket: row.socket, cores: row.cores, threads: row.threads }] };
      }
      return { rows: [] };
    }),
  };
}

describe('hasSpecTable', () => {
  test('true for compatibility-relevant categories', () => {
    expect(hasSpecTable('cpu')).toBe(true);
    expect(hasSpecTable('motherboard')).toBe(true);
    expect(hasSpecTable('psu')).toBe(true);
  });

  test('false for categories with no compatibility spec table', () => {
    expect(hasSpecTable('monitor')).toBe(false);
    expect(hasSpecTable('full-pc')).toBe(false);
    expect(hasSpecTable('accessories')).toBe(false);
  });
});

describe('upsertSpecs + assembleSpecs round-trip', () => {
  test('CPU spec round-trips through the typed table with product_id', async () => {
    const pool = makeFakePool();
    await upsertSpecs(pool, 'cpu', 42, { socket: 'AM5', cores: 8, threads: 16 });

    const specs = await assembleSpecs(pool, 'cpu', 42);
    expect(specs).toEqual({ socket: 'AM5', cores: 8, threads: 16 });
  });

  test('assembleSpecs returns {} for a product with no spec row yet', async () => {
    const pool = makeFakePool();
    const specs = await assembleSpecs(pool, 'cpu', 999);
    expect(specs).toEqual({});
  });

  test('upsertSpecs is a no-op for categories without a spec table (monitor/full-pc/accessories)', async () => {
    const pool = makeFakePool();
    await upsertSpecs(pool, 'monitor', 1, { resolution: '1440p' });
    expect(pool.query).not.toHaveBeenCalled();
  });
});
