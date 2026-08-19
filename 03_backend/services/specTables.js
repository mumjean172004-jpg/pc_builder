/**
 * PC Builder Pro — Typed spec-table registry (Product-Centric)
 *
 * Each spec table (spec_cpu, spec_motherboard, ...) is 1:1 with `products` via `product_id`.
 */

const CATEGORY_SPEC_CONFIG = {
  cpu: {
    table: 'spec_cpu',
    plain: ['socket', 'generation', 'series', 'cores', 'threads'],
  },
  motherboard: {
    table: 'spec_motherboard',
    plain: ['socket', 'chipset', 'generation', 'form_factor', 'ram_type', 'ram_slots', 'max_ram_gb'],
  },
  ram: {
    table: 'spec_ram',
    plain: ['type', 'capacity_gb', 'speed', 'modules'],
  },
  gpu: {
    table: 'spec_gpu',
    plain: ['series', 'chip', 'vram_gb', 'vram_type', 'length_mm'],
  },
  psu: {
    table: 'spec_psu',
    plain: ['wattage', 'efficiency', 'modularity'],
  },
  storage: {
    table: 'spec_storage',
    plain: ['interface', 'capacity_gb', 'read_speed'],
  },
};

function hasSpecTable(categorySlug) {
  return Object.prototype.hasOwnProperty.call(CATEGORY_SPEC_CONFIG, categorySlug);
}

function assertPool(pool, fnName) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error(`${fnName}(pool, ...) was called without a valid pool as the first argument`);
  }
}

function buildSelect(categorySlug, alias = 's') {
  const config = CATEGORY_SPEC_CONFIG[categorySlug];
  if (!config) return null;

  const selectParts = config.plain.map(col => `${alias}.${col} AS \`${col}\``);

  return {
    table: config.table,
    select: selectParts.join(', '),
  };
}

/** Fetch one product's specs. Returns {} if category has no spec table or no row exists. */
async function assembleSpecs(pool, categorySlug, productId) {
  assertPool(pool, 'assembleSpecs');
  const built = buildSelect(categorySlug);
  if (!built) return {};

  const result = await pool.query(
    `SELECT ${built.select} FROM ${built.table} s WHERE s.product_id = ?`,
    [productId]
  );
  if (!result.rows?.length) return {};
  return normalizeRow(result.rows[0]);
}

/** Batch variant to avoid N+1 when listing many products of the same category. */
async function assembleSpecsBatch(pool, categorySlug, productIds) {
  assertPool(pool, 'assembleSpecsBatch');
  const specsByProductId = {};
  if (!productIds.length) return specsByProductId;

  const built = buildSelect(categorySlug);
  if (!built) return specsByProductId;

  const placeholders = productIds.map(() => '?').join(',');
  const result = await pool.query(
    `SELECT s.product_id AS __product_id, ${built.select} FROM ${built.table} s WHERE s.product_id IN (${placeholders})`,
    productIds
  );
  for (const row of result.rows || []) {
    const { __product_id, ...rest } = row;
    specsByProductId[__product_id] = normalizeRow(rest);
  }
  return specsByProductId;
}

function normalizeRow(row) {
  return { ...row };
}

/**
 * Insert or replace the spec row for a product.
 */
async function upsertSpecs(pool, categorySlug, productId, specsInput) {
  assertPool(pool, 'upsertSpecs');
  const config = CATEGORY_SPEC_CONFIG[categorySlug];
  if (!config) return;

  const columns = ['product_id'];
  const values = [productId];

  for (const col of config.plain) {
    if (specsInput[col] !== undefined) {
      columns.push(col);
      let v = specsInput[col];
      if (typeof v === 'boolean') v = v ? 1 : 0;
      values.push(v);
    }
  }

  const placeholders = columns.map(() => '?').join(', ');
  const updateClause = columns
    .filter(c => c !== 'product_id')
    .map(c => `\`${c}\` = VALUES(\`${c}\`)`)
    .join(', ');

  const sql = `INSERT INTO ${config.table} (${columns.join(', ')}) VALUES (${placeholders}) ${
    updateClause ? `ON DUPLICATE KEY UPDATE ${updateClause}` : ''
  }`;

  await pool.query(sql, values);
}

module.exports = {
  CATEGORY_SPEC_CONFIG,
  hasSpecTable,
  assembleSpecs,
  assembleSpecsBatch,
  upsertSpecs,
};
