/**
 * Unit tests for services/paginationService.js
 */

const {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  normalizePage,
  normalizeLimit,
  computeOffset,
  computeTotalPages,
} = require('../services/paginationService');

describe('normalizePage', () => {
  test('accepts a valid positive integer string', () => {
    expect(normalizePage('3')).toBe(3);
  });

  test('falls back to 1 for missing/invalid/zero/negative values', () => {
    expect(normalizePage(undefined)).toBe(1);
    expect(normalizePage('abc')).toBe(1);
    expect(normalizePage('0')).toBe(1);
    expect(normalizePage('-5')).toBe(1);
  });
});

describe('normalizeLimit', () => {
  test('accepts a valid positive integer string', () => {
    expect(normalizeLimit('10')).toBe(10);
  });

  test('falls back to DEFAULT_LIMIT for missing/invalid/zero/negative values', () => {
    expect(normalizeLimit(undefined)).toBe(DEFAULT_LIMIT);
    expect(normalizeLimit('abc')).toBe(DEFAULT_LIMIT);
    expect(normalizeLimit('0')).toBe(DEFAULT_LIMIT);
    expect(normalizeLimit('-5')).toBe(DEFAULT_LIMIT);
  });

  test('caps at MAX_LIMIT to prevent abuse', () => {
    expect(normalizeLimit('99999')).toBe(MAX_LIMIT);
  });
});

describe('computeOffset', () => {
  test('page 1 has offset 0', () => {
    expect(computeOffset(1, 24)).toBe(0);
  });

  test('page 3 with limit 24 offsets 48', () => {
    expect(computeOffset(3, 24)).toBe(48);
  });
});

describe('computeTotalPages', () => {
  test('divides evenly', () => {
    expect(computeTotalPages(48, 24)).toBe(2);
  });

  test('rounds up a partial last page', () => {
    expect(computeTotalPages(31, 24)).toBe(2);
  });

  test('returns at least 1 page even with zero results', () => {
    expect(computeTotalPages(0, 24)).toBe(1);
  });
});
