/**
 * Unit tests for services/compatibilityService.js — checkCompatibility()
 *
 * checkCompatibility() takes a `pool` and fetches each build part's row via
 * `pool.query('... WHERE p.id = ?', [part_id])`. Rather than refactoring the
 * production code (which mixes the DB fetch with the pure comparison logic),
 * we exercise the real exported function end-to-end against a fake in-memory
 * "pool" that resolves parts by id. This keeps the test honest to the actual
 * exported behavior without needing a live MySQL database.
 *
 * Expected thresholds/messages are taken from
 * KnowledgeBase/05_pc_builder/PC_Builder_Compatibility.md, cross-checked
 * against the actual source in services/compatibilityService.js (noted
 * inline where the doc and code disagree).
 */

const { checkCompatibility } = require('../services/compatibilityService');

function makeFakePool(partsById) {
  return {
    query: jest.fn(async (_sql, params) => {
      const id = params[0];
      const row = partsById[id];
      return { rows: row ? [row] : [] };
    }),
  };
}

function bp(part_id, quantity = 1) {
  return { part_id, quantity };
}

describe('checkCompatibility — CPU <-> Motherboard socket', () => {
  test('matching socket + mapped chipset => compatible, no errors/warnings', async () => {
    const parts = {
      1: { id: 1, name: 'Core i9-13900K', category_slug: 'cpu', specs: { socket: 'LGA1700', tdp: 125 } },
      2: { id: 2, name: 'Z790 Board', category_slug: 'motherboard', specs: { socket: 'LGA1700', chipset: 'Z790', form_factor: 'ATX' } },
    };
    const result = await checkCompatibility(makeFakePool(parts), [bp(1), bp(2)]);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.compatible).toBe(true);
  });

  test('mismatched socket => error and NOT compatible', async () => {
    const parts = {
      1: { id: 1, name: 'Core i9-13900K', category_slug: 'cpu', specs: { socket: 'LGA1700', tdp: 125 } },
      2: { id: 2, name: 'B550 Board', category_slug: 'motherboard', specs: { socket: 'AM4', chipset: 'B550', form_factor: 'ATX' } },
    };
    const result = await checkCompatibility(makeFakePool(parts), [bp(1), bp(2)]);
    expect(result.compatible).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toMatch(/Socket ของ CPU \(LGA1700\)/);
    expect(result.errors[0]).toMatch(/AM4/);
  });

  test('matching socket but chipset unmapped => warning only, still compatible', async () => {
    const parts = {
      1: { id: 1, name: 'Ryzen 5 5600X', category_slug: 'cpu', specs: { socket: 'AM4', tdp: 65 } },
      // 'X99' is not in the AM4 chipset list in SOCKET_CHIPSET_MAP
      2: { id: 2, name: 'X99 Board', category_slug: 'motherboard', specs: { socket: 'AM4', chipset: 'X99', form_factor: 'ATX' } },
    };
    const result = await checkCompatibility(makeFakePool(parts), [bp(1), bp(2)]);
    expect(result.errors).toEqual([]);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toMatch(/ชิปเซ็ต X99/);
    expect(result.compatible).toBe(true);
  });
});

describe('checkCompatibility — RAM type & capacity', () => {
  const motherboard = {
    id: 2,
    name: 'B550 Board',
    category_slug: 'motherboard',
    specs: { socket: 'AM4', chipset: 'B550', ram_type: 'DDR4', max_ram_gb: 64, ram_slots: 4, form_factor: 'ATX' },
  };

  test('RAM type mismatch => error', async () => {
    const parts = {
      2: motherboard,
      3: { id: 3, name: 'DDR5 Kit', category_slug: 'ram', specs: { type: 'DDR5', capacity_gb: 16, modules: 2 } },
    };
    const result = await checkCompatibility(makeFakePool(parts), [bp(2), bp(3)]);
    expect(result.compatible).toBe(false);
    expect(result.errors.some(e => e.includes('ชนิดของ RAM (DDR5)'))).toBe(true);
  });

  test('RAM total capacity over motherboard max => warning, still compatible (no error)', async () => {
    const parts = {
      2: motherboard, // max_ram_gb: 64
      3: { id: 3, name: 'DDR4 32GB Kit', category_slug: 'ram', specs: { type: 'DDR4', capacity_gb: 32, modules: 2 } },
    };
    // quantity 4 modules of a 32GB kit(each counted as 2 modules) => 4 * 32 = 128GB > 64GB max
    const result = await checkCompatibility(makeFakePool(parts), [bp(2), bp(3, 4)]);
    expect(result.errors).toEqual([]);
    expect(result.warnings.some(w => w.includes('ความจุ RAM รวม'))).toBe(true);
    expect(result.compatible).toBe(true);
  });

  test('RAM module count over motherboard slots => warning', async () => {
    const parts = {
      2: motherboard, // ram_slots: 4
      3: { id: 3, name: 'DDR4 8GB stick', category_slug: 'ram', specs: { type: 'DDR4', capacity_gb: 8, modules: 1 } },
    };
    const result = await checkCompatibility(makeFakePool(parts), [bp(2), bp(3, 6)]);
    expect(result.warnings.some(w => w.includes('จำนวนแถวของ RAM'))).toBe(true);
  });
});

describe('checkCompatibility — GPU length vs case', () => {
  test('GPU length exceeds case max => error', async () => {
    const parts = {
      4: { id: 4, name: 'RTX 4090', category_slug: 'gpu', specs: { length_mm: 336, tdp: 450 } },
      5: { id: 5, name: 'Meshify C', category_slug: 'case', specs: { max_gpu_length_mm: 315, form_factor: 'ATX' } },
    };
    const result = await checkCompatibility(makeFakePool(parts), [bp(4), bp(5)]);
    expect(result.compatible).toBe(false);
    expect(result.errors.some(e => e.includes('336 มม.') && e.includes('315 มม.'))).toBe(true);
  });

  test('GPU length within 90% of case max => warning (not error)', async () => {
    // max = 350mm, 90% threshold = 315mm. length 320mm is > 315 but <= 350 => warning only
    const parts = {
      4: { id: 4, name: 'RTX 4070', category_slug: 'gpu', specs: { length_mm: 320, tdp: 200 } },
      5: { id: 5, name: 'Big Case', category_slug: 'case', specs: { max_gpu_length_mm: 350, form_factor: 'ATX' } },
    };
    const result = await checkCompatibility(makeFakePool(parts), [bp(4), bp(5)]);
    expect(result.errors).toEqual([]);
    expect(result.warnings.some(w => w.includes('ใกล้เคียงกับขีดจำกัด'))).toBe(true);
  });

  test('GPU length comfortably under 90% threshold => no warning, no error', async () => {
    // max = 350mm, 90% threshold = 315mm. length 300mm is well under => nothing
    const parts = {
      4: { id: 4, name: 'RTX 4060', category_slug: 'gpu', specs: { length_mm: 300, tdp: 115 } },
      5: { id: 5, name: 'Big Case', category_slug: 'case', specs: { max_gpu_length_mm: 350, form_factor: 'ATX' } },
    };
    const result = await checkCompatibility(makeFakePool(parts), [bp(4), bp(5)]);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});

describe('checkCompatibility — PSU wattage', () => {
  // Rule (actual code, services/compatibilityService.js line ~125):
  //   totalTdp = cpu.tdp + sum(gpu.tdp) + 100
  //   recommendedWattage = ceil(totalTdp * 1.25)
  // NOTE: KnowledgeBase/05_pc_builder/PC_Builder_Compatibility.md documents the
  // safety-margin multiplier as 1.2, but the actual implementation uses 1.25.
  // Tests below assert the real code behavior (1.25x), since the source code is
  // the ground truth for what actually runs.

  test('PSU wattage below total TDP => error (critical)', async () => {
    const parts = {
      1: { id: 1, name: 'CPU', category_slug: 'cpu', specs: { socket: 'LGA1700', tdp: 125 } },
      4: { id: 4, name: 'GPU', category_slug: 'gpu', specs: { length_mm: 300, tdp: 450 } },
      6: { id: 6, name: 'PSU 550W', category_slug: 'psu', specs: { wattage: 550 } },
    };
    // totalTdp = 125 + 450 + 100 = 675W; PSU 550W < 675W => error
    const result = await checkCompatibility(makeFakePool(parts), [bp(1), bp(4), bp(6)]);
    expect(result.compatible).toBe(false);
    expect(result.errors.some(e => e.includes('550W') && e.includes('675W'))).toBe(true);
  });

  test('PSU wattage sufficient for TDP but below recommended (1.25x) headroom => warning', async () => {
    const parts = {
      1: { id: 1, name: 'CPU', category_slug: 'cpu', specs: { socket: 'LGA1700', tdp: 100 } },
      4: { id: 4, name: 'GPU', category_slug: 'gpu', specs: { length_mm: 300, tdp: 200 } },
      // totalTdp = 100 + 200 + 100 = 400W; recommended = ceil(400*1.25) = 500W
      6: { id: 6, name: 'PSU 450W', category_slug: 'psu', specs: { wattage: 450 } },
    };
    const result = await checkCompatibility(makeFakePool(parts), [bp(1), bp(4), bp(6)]);
    expect(result.errors).toEqual([]);
    expect(result.warnings.some(w => w.includes('450W') && w.includes('500W'))).toBe(true);
    expect(result.compatible).toBe(true);
  });

  test('PSU wattage meets recommended headroom => no error, no warning', async () => {
    const parts = {
      1: { id: 1, name: 'CPU', category_slug: 'cpu', specs: { socket: 'LGA1700', tdp: 100 } },
      4: { id: 4, name: 'GPU', category_slug: 'gpu', specs: { length_mm: 300, tdp: 200 } },
      // totalTdp = 400W; recommended = 500W
      6: { id: 6, name: 'PSU 750W', category_slug: 'psu', specs: { wattage: 750 } },
    };
    const result = await checkCompatibility(makeFakePool(parts), [bp(1), bp(4), bp(6)]);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});

describe('checkCompatibility — CPU cooler height vs case', () => {
  test('cooler height exceeds case max => error', async () => {
    const parts = {
      7: { id: 7, name: 'Noctua NH-D15', category_slug: 'cpu-cooler', specs: { height_mm: 165 } },
      5: { id: 5, name: 'MasterBox Q300L', category_slug: 'case', specs: { max_cooler_height_mm: 157, form_factor: 'mATX' } },
    };
    const result = await checkCompatibility(makeFakePool(parts), [bp(7), bp(5)]);
    expect(result.compatible).toBe(false);
    expect(result.errors.some(e => e.includes('165 มม.') && e.includes('157 มม.'))).toBe(true);
  });

  test('cooler height within case max => no error', async () => {
    const parts = {
      7: { id: 7, name: 'Stock Cooler', category_slug: 'cpu-cooler', specs: { height_mm: 80 } },
      5: { id: 5, name: 'MasterBox Q300L', category_slug: 'case', specs: { max_cooler_height_mm: 157, form_factor: 'mATX' } },
    };
    const result = await checkCompatibility(makeFakePool(parts), [bp(7), bp(5)]);
    expect(result.errors).toEqual([]);
  });
});
