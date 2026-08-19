const express = require('express');
const router = express.Router();
const lookupController = require('../controllers/lookupController');

// This file used to also mount partsController.js's CRUD for the standalone
// `parts` reference-catalog table — removed 2026-08-17 along with the `parts`
// table itself (see scripts/migrate_remove_parts.js). Only the cascading-dropdown
// lookup endpoints remain, all unrelated to `parts`. The URL prefix (`/api/parts`)
// is kept as-is so no frontend caller needed updating.

// Master lookup tables (cascading dropdowns)
router.get('/lookups/sockets', lookupController.getSockets);
router.get('/lookups/chipsets', lookupController.getChipsets);
router.get('/lookups/form-factors', lookupController.getFormFactors);
router.get('/lookups/ram-types', lookupController.getRamTypes);
router.get('/lookups/brands', lookupController.getBrands);
router.get('/lookups/cpu-series', lookupController.getCpuSeries);
router.get('/lookups/vga-series', lookupController.getVgaSeries);
router.get('/lookups/gpu-chips', lookupController.getGpuChips);
router.get('/lookups/psu-modular', lookupController.getPsuModular);
router.get('/lookups/psu-efficiency', lookupController.getPsuEfficiency);
router.get('/lookups/cpu-generations', lookupController.getCpuGenerations);
router.get('/lookups/cpu-models', lookupController.getCpuModels);

router.get('/categories', lookupController.getCategories);

module.exports = router;
