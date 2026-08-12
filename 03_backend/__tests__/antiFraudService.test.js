/**
 * Unit tests for services/antiFraudService.js — scoreListing()
 *
 * This module was extracted from controllers/productController.js's inline
 * `evaluateSuspicion` so the pure scoring rules could be unit tested without a
 * live database. The DB-dependent piece (looking up whether a duplicate active
 * serial number exists) is now the caller's responsibility — it's passed in as
 * the boolean `hasDuplicateSerial`.
 *
 * Rule source of truth: KnowledgeBase/05_pc_builder/Marketplace_Listing_Checks.md,
 * cross-checked against controllers/productController.js.
 */

const { scoreListing, CONDITION_PRICE_FLOOR } = require('../services/antiFraudService');

describe('scoreListing — price floor by condition', () => {
  test('condition floors match documented percentages', () => {
    expect(CONDITION_PRICE_FLOOR).toEqual({
      new: 0.65,
      used_90: 0.5,
      used_80: 0.4,
      used_70: 0.3,
    });
  });

  test('price at exactly the floor => no penalty (floor is exclusive: price < floor triggers)', () => {
    // new: floor = 10000 * 0.65 = 6500
    const result = scoreListing({ catalogPrice: 10000, condition: 'new', price: 6500, hasDuplicateSerial: false });
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  test('price above the floor => no penalty', () => {
    const result = scoreListing({ catalogPrice: 10000, condition: 'used_90', price: 6000, hasDuplicateSerial: false });
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  test('price 1 baht below the floor => +70 penalty with reason', () => {
    // used_90: floor = 10000 * 0.5 = 5000
    const result = scoreListing({ catalogPrice: 10000, condition: 'used_90', price: 4999, hasDuplicateSerial: false });
    expect(result.score).toBe(70);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toMatch(/unusually low/);
    expect(result.reasons[0]).toMatch(/50%\)/); // Math.round(4999/10000*100) = 50
  });

  test.each([
    ['new', 0.65],
    ['used_90', 0.5],
    ['used_80', 0.4],
    ['used_70', 0.3],
  ])('%s condition: price just under floor triggers +70', (condition, floorPct) => {
    const catalogPrice = 10000;
    const floor = catalogPrice * floorPct;
    const result = scoreListing({ catalogPrice, condition, price: floor - 1, hasDuplicateSerial: false });
    expect(result.score).toBe(70);
  });

  test('unknown/missing condition falls back to 40% floor', () => {
    const catalogPrice = 10000; // fallback floor = 4000
    const belowFallbackFloor = scoreListing({ catalogPrice, condition: 'unknown_condition', price: 3999, hasDuplicateSerial: false });
    expect(belowFallbackFloor.score).toBe(70);

    const atFallbackFloor = scoreListing({ catalogPrice, condition: 'unknown_condition', price: 4000, hasDuplicateSerial: false });
    expect(atFallbackFloor.score).toBe(0);
  });

  test('no catalog price (part not in catalog, e.g. prebuilt) => price-floor check is skipped entirely', () => {
    const result = scoreListing({ catalogPrice: null, condition: 'new', price: 1, hasDuplicateSerial: false });
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });
});

describe('scoreListing — duplicate serial number', () => {
  test('duplicate serial => +90 penalty with reason', () => {
    const result = scoreListing({ catalogPrice: 10000, condition: 'new', price: 9000, hasDuplicateSerial: true });
    expect(result.score).toBe(90);
    expect(result.reasons).toEqual(['Serial number already exists on another non-sold listing.']);
  });

  test('no duplicate serial => no penalty', () => {
    const result = scoreListing({ catalogPrice: 10000, condition: 'new', price: 9000, hasDuplicateSerial: false });
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });
});

describe('scoreListing — combined rule triggers', () => {
  test('both underpriced AND duplicate serial => scores ADD UP to 160 (score is NOT capped at 100)', () => {
    // This matches the real productController.js logic: suspicious_score is a raw
    // sum with no Math.min(100, ...) clamp anywhere in the source.
    const result = scoreListing({ catalogPrice: 10000, condition: 'new', price: 100, hasDuplicateSerial: true });
    expect(result.score).toBe(160);
    expect(result.reasons).toHaveLength(2);
  });
});

describe('review_status pending_review threshold (as implemented in productController.js)', () => {
  // NOTE: The task brief for this test suite assumed the pending_review cutoff was
  // suspicious_score >= 70. The ACTUAL source code
  // (controllers/productController.js: `const reviewStatus = suspicion.score >= 80
  // ? 'pending_review' : 'approved';`) uses >= 80, not 70. The code is the ground
  // truth for behavior, so the tests below assert against the real 80 threshold.
  // This discrepancy is called out in the test-run report.
  function reviewStatusFor(score) {
    return score >= 80 ? 'pending_review' : 'approved';
  }

  test('score of 70 (single price-floor violation only) => still "approved", below the real 80 cutoff', () => {
    const { score } = scoreListing({ catalogPrice: 10000, condition: 'new', price: 1, hasDuplicateSerial: false });
    expect(score).toBe(70);
    expect(reviewStatusFor(score)).toBe('approved');
  });

  test('score of 79 => approved; score of 80 => pending_review (exact boundary)', () => {
    expect(reviewStatusFor(79)).toBe('approved');
    expect(reviewStatusFor(80)).toBe('pending_review');
  });

  test('duplicate serial alone (score 90) => pending_review', () => {
    const { score } = scoreListing({ catalogPrice: 10000, condition: 'new', price: 9000, hasDuplicateSerial: true });
    expect(score).toBe(90);
    expect(reviewStatusFor(score)).toBe('pending_review');
  });
});
