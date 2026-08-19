/**
 * Unit tests for services/compatibilityService.js — checkCompatibility() (Product-Centric)
 */

const { checkCompatibility } = require('../services/compatibilityService');

function makeFakePool(fixtures) {
  return {
    query: jest.fn(async (sql, params) => {
      if (sql.includes('FROM products')) {
        const f = fixtures[params[0]];
        if (!f) return { rows: [] };
        return { rows: [{ product_id: Number(params[0]), price: f.price, original_price: f.original_price, brand: f.brand, model: f.model, name: f.name, category_slug: f.category_slug }] };
      }
      if (/FROM spec_/.test(sql)) {
        const f = fixtures[params[0]];
        return { rows: f ? [f.specs] : [] };
      }
      return { rows: [] };
    }),
  };
}

function productFixture(productId, categorySlug, specs, extra = {}) {
  return {
    id: productId,
    price: 1000,
    original_price: 1200,
    name: extra.name || `Product ${productId}`,
    brand: extra.brand || 'Brand',
    model: extra.model || `Model ${productId}`,
    category_slug: categorySlug,
    specs
  };
}

function bp(productId, quantity = 1) {
  return { product_id: productId, quantity };
}

describe('checkCompatibility — CPU <-> Motherboard socket', () => {
  test('matching socket + mapped chipset => compatible, no errors/warnings', async () => {
    const products = {
      1: productFixture(1, 'cpu', { socket: 'LGA1700' }, { model: 'Core i9-13900K' }),
      2: productFixture(2, 'motherboard', { socket: 'LGA1700', chipset: 'Z790', form_factor: 'ATX' }, { model: 'Z790 Board' }),
    };
    const result = await checkCompatibility(makeFakePool(products), [bp(1), bp(2)]);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.compatible).toBe(true);
  });

  test('mismatched socket => error and NOT compatible', async () => {
    const products = {
      1: productFixture(1, 'cpu', { socket: 'LGA1700' }, { model: 'Core i9-13900K' }),
      2: productFixture(2, 'motherboard', { socket: 'AM4', chipset: 'B550', form_factor: 'ATX' }, { model: 'B550 Board' }),
    };
    const result = await checkCompatibility(makeFakePool(products), [bp(1), bp(2)]);
    expect(result.compatible).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toMatch(/Socket ของ CPU \(LGA1700\)/);
    expect(result.errors[0]).toMatch(/AM4/);
  });

  test('matching socket but chipset unmapped => warning only, still compatible', async () => {
    const products = {
      1: productFixture(1, 'cpu', { socket: 'AM4' }, { model: 'Ryzen 5 5600X' }),
      2: productFixture(2, 'motherboard', { socket: 'AM4', chipset: 'X99', form_factor: 'ATX' }, { model: 'X99 Board' }),
    };
    const result = await checkCompatibility(makeFakePool(products), [bp(1), bp(2)]);
    expect(result.compatible).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toMatch(/ชิปเซ็ต X99 อาจไม่รองรับ/);
  });
});

describe('checkCompatibility — RAM <-> Motherboard', () => {
  test('matching RAM type + within capacity/slot limits => compatible', async () => {
    const products = {
      1: productFixture(1, 'motherboard', { socket: 'AM5', chipset: 'B650', form_factor: 'ATX', ram_type: 'DDR5', max_ram_gb: 128, ram_slots: 4 }),
      2: productFixture(2, 'ram', { type: 'DDR5', capacity_gb: 32, modules: 2 }),
    };
    const result = await checkCompatibility(makeFakePool(products), [bp(1), bp(2)]);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.compatible).toBe(true);
  });

  test('RAM type mismatch => error and NOT compatible', async () => {
    const products = {
      1: productFixture(1, 'motherboard', { socket: 'AM5', chipset: 'B650', form_factor: 'ATX', ram_type: 'DDR5', max_ram_gb: 128, ram_slots: 4 }),
      2: productFixture(2, 'ram', { type: 'DDR4', capacity_gb: 16, modules: 2 }),
    };
    const result = await checkCompatibility(makeFakePool(products), [bp(1), bp(2)]);
    expect(result.compatible).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toMatch(/ชนิดของ RAM \(DDR4\) ไม่ตรงกับชนิดที่ Motherboard รองรับ \(DDR5\)/);
  });
});
