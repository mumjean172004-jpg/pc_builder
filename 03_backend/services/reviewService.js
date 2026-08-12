/**
 * PC Builder Pro — Seller Review Scoring
 *
 * Pure helpers extracted so the rating logic can be unit tested without a
 * live database connection.
 */

function isValidRating(rating) {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

/**
 * @param {number[]} ratings - all rating values (1-5) for a seller.
 * @returns {number} average rounded to 2 decimals, or 0 when there are no ratings.
 */
function computeAverageRating(ratings) {
  if (!ratings || ratings.length === 0) return 0;
  const sum = ratings.reduce((total, r) => total + Number(r), 0);
  return Math.round((sum / ratings.length) * 100) / 100;
}

module.exports = { isValidRating, computeAverageRating };
