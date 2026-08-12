/**
 * PC Builder Pro — Pagination helpers
 *
 * Pure math extracted so page/offset/totalPages calculations can be unit
 * tested without a live database.
 */

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

function normalizePage(rawPage) {
  const page = parseInt(rawPage, 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function normalizeLimit(rawLimit) {
  const limit = parseInt(rawLimit, 10);
  if (!Number.isInteger(limit) || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}

function computeOffset(page, limit) {
  return (page - 1) * limit;
}

function computeTotalPages(total, limit) {
  return Math.max(1, Math.ceil(total / limit));
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  normalizePage,
  normalizeLimit,
  computeOffset,
  computeTotalPages,
};
