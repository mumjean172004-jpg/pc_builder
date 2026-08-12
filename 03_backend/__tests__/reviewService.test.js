/**
 * Unit tests for services/reviewService.js — isValidRating() / computeAverageRating()
 */

const { isValidRating, computeAverageRating } = require('../services/reviewService');

describe('isValidRating', () => {
  test('accepts integers 1-5', () => {
    expect(isValidRating(1)).toBe(true);
    expect(isValidRating(5)).toBe(true);
    expect(isValidRating(3)).toBe(true);
  });

  test('rejects out-of-range and non-integer values', () => {
    expect(isValidRating(0)).toBe(false);
    expect(isValidRating(6)).toBe(false);
    expect(isValidRating(3.5)).toBe(false);
    expect(isValidRating(-1)).toBe(false);
  });

  test('rejects non-numeric input', () => {
    expect(isValidRating('5')).toBe(false);
    expect(isValidRating(null)).toBe(false);
    expect(isValidRating(undefined)).toBe(false);
  });
});

describe('computeAverageRating', () => {
  test('returns 0 for no ratings', () => {
    expect(computeAverageRating([])).toBe(0);
    expect(computeAverageRating(null)).toBe(0);
  });

  test('averages a single rating', () => {
    expect(computeAverageRating([5])).toBe(5);
  });

  test('averages multiple ratings and rounds to 2 decimals', () => {
    expect(computeAverageRating([5, 4, 3])).toBe(4);
    expect(computeAverageRating([5, 4, 4])).toBe(4.33);
  });

  test('handles string-typed DECIMAL-like inputs from mysql2', () => {
    expect(computeAverageRating(['5', '3'])).toBe(4);
  });
});
