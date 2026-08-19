const pool = require('../config/database');
const { sendServerError } = require('../utils/errorHandler');

// Master lookup tables — power the cascading dropdowns on the admin catalog form
// and the seller "add new model" form (pick socket -> filtered chipset list, etc.)

// Moved here from the now-removed partsController.js (2026-08-17, `parts` table
// removal) — categories never touched the `parts` table, it just lived in that
// file historically. Route path (`/api/parts/categories`) is unchanged so no
// frontend caller needed updating.
exports.getCategories = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY display_order ASC');
    res.json(result.rows || []);
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.getSockets = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, brand FROM sockets ORDER BY brand, name');
    res.json(result.rows || []);
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.getChipsets = async (req, res) => {
  try {
    const { socket_id } = req.query;
    if (!socket_id) {
      return res.status(400).json({ error: 'socket_id is required' });
    }
    const result = await pool.query('SELECT id, name FROM chipsets WHERE socket_id = ? ORDER BY name', [socket_id]);
    res.json(result.rows || []);
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.getFormFactors = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, size_level FROM form_factors ORDER BY size_level');
    res.json(result.rows || []);
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.getRamTypes = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM ram_types ORDER BY name');
    res.json(result.rows || []);
  } catch (error) {
    sendServerError(res, error);
  }
};

// Flat name-list lookups (brand/CPU-series/VGA-series/GPU-chip/PSU standards) all
// share the same shape — one factory instead of six near-identical handlers.
function flatLookupHandler(table) {
  return async (req, res) => {
    try {
      const result = await pool.query(`SELECT id, name FROM ${table} ORDER BY name`);
      res.json(result.rows || []);
    } catch (error) {
      sendServerError(res, error);
    }
  };
}

exports.getBrands = flatLookupHandler('brands');
exports.getCpuSeries = flatLookupHandler('cpu_series');
exports.getVgaSeries = flatLookupHandler('vga_series');
exports.getPsuModular = flatLookupHandler('psu_modular');
exports.getPsuEfficiency = flatLookupHandler('psu_efficiency');

// Unlike getChipsets (which 400s without socket_id), series_id is optional here —
// showing the full unfiltered chip list before a series is picked is a reasonable
// first state, not an error.
exports.getGpuChips = async (req, res) => {
  try {
    const { series_id } = req.query;
    const result = series_id
      ? await pool.query('SELECT id, name FROM gpu_chips WHERE series_id = ? ORDER BY name', [series_id])
      : await pool.query('SELECT id, name FROM gpu_chips ORDER BY name');
    res.json(result.rows || []);
  } catch (error) {
    sendServerError(res, error);
  }
};

// CPU generation/model picker — cascading UI data only, never read by
// compatibilityService (which is driven entirely by spec_cpu.socket_id).
// socket_id is always included (even when filtering by it) so callers that
// still want to auto-fill/display the socket don't need a second lookup.
// Optional like getGpuChips's ?series_id= — unfiltered is a reasonable first
// state, not an error.
exports.getCpuGenerations = async (req, res) => {
  try {
    const { socket_id } = req.query;
    const result = socket_id
      ? await pool.query('SELECT id, name, brand, socket_id FROM cpu_generations WHERE socket_id = ? ORDER BY name', [socket_id])
      : await pool.query('SELECT id, name, brand, socket_id FROM cpu_generations ORDER BY brand, name');
    res.json(result.rows || []);
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.getCpuModels = async (req, res) => {
  try {
    const { generation_id } = req.query;
    if (!generation_id) {
      return res.status(400).json({ error: 'generation_id is required' });
    }
    const result = await pool.query('SELECT id, name FROM cpu_models WHERE generation_id = ? ORDER BY name', [generation_id]);
    res.json(result.rows || []);
  } catch (error) {
    sendServerError(res, error);
  }
};
