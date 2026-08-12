const pool = require('../config/database');
const { checkCompatibility, getBuildPartsMap, calculateIntelligence, crossMatchMarketplace } = require('../services/compatibilityService');
const { sendServerError } = require('../utils/errorHandler');

// Helper to convert PostgreSQL-style queries to SQLite
function toSQLite(text) {
  let sql = text;
  let i = 1;
  while (sql.includes(`$${i}`)) {
    sql = sql.replace(`$${i}`, '?');
    i++;
  }
  return sql;
}

// Get all public builds
exports.getBuilds = async (req, res) => {
  try {
    const { page = 1, limit = 12, sort = 'newest', search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE b.is_public = 1';
    const params = [];

    if (search) {
      whereClause += ' AND (b.name LIKE ? OR b.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    let orderBy = 'b.created_at DESC';
    switch (sort) {
      case 'popular': orderBy = 'likes_count DESC, b.created_at DESC'; break;
      case 'price_low': orderBy = 'b.total_price ASC'; break;
      case 'price_high': orderBy = 'b.total_price DESC'; break;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as cnt FROM builds b ${whereClause}`, params
    );
    const total = countResult.rows[0].cnt;

    const result = await pool.query(
      `SELECT b.*, u.username as author_name, u.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM build_likes bl WHERE bl.build_id = b.id) as likes_count,
        (SELECT COUNT(*) FROM build_comments bc WHERE bc.build_id = b.id) as comments_count
       FROM builds b JOIN users u ON b.user_id = u.id
       ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      builds: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// Get single build
exports.getBuildById = async (req, res) => {
  try {
    const { id } = req.params;

    const buildResult = await pool.query(
      `SELECT b.*, u.username as author_name, u.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM build_likes bl WHERE bl.build_id = b.id) as likes_count,
        (SELECT COUNT(*) FROM build_comments bc WHERE bc.build_id = b.id) as comments_count
       FROM builds b JOIN users u ON b.user_id = u.id WHERE b.id = ?`,
      [id]
    );

    if (!buildResult.rows || buildResult.rows.length === 0) {
      return res.status(404).json({ error: 'Build not found' });
    }

    const build = buildResult.rows[0];

    if (!build.is_public && (!req.userId || req.userId !== build.user_id)) {
      return res.status(403).json({ error: 'This build is private' });
    }

    const partsResult = await pool.query(
      `SELECT bp.*, p.name, p.brand, p.model, p.specs, p.price, p.image_url,
        c.name as category_name, c.slug as category_slug
       FROM build_parts bp
       JOIN parts p ON bp.part_id = p.id
       JOIN categories c ON p.category_id = c.id
       WHERE bp.build_id = ?
       ORDER BY c.display_order ASC`,
      [id]
    );

    let userLiked = false;
    if (req.userId) {
      const likeResult = await pool.query(
        'SELECT id FROM build_likes WHERE build_id = ? AND user_id = ?',
        [id, req.userId]
      );
      userLiked = likeResult.rows && likeResult.rows.length > 0;
    }

    const commentsResult = await pool.query(
      `SELECT bc.*, u.username, u.avatar_url
       FROM build_comments bc JOIN users u ON bc.user_id = u.id
       WHERE bc.build_id = ? ORDER BY bc.created_at DESC`,
      [id]
    );

    const parsedParts = (partsResult.rows || []).map(p => {
      if (typeof p.specs === 'string') {
        try { p.specs = JSON.parse(p.specs); } catch (e) {}
      }
      return p;
    });

    res.json({
      ...build,
      parts: parsedParts,
      user_liked: userLiked,
      comments: commentsResult.rows || [],
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// Create build
exports.createBuild = async (req, res) => {
  try {
    const { name, description, is_public = true, parts: buildParts } = req.body;
    const userId = req.userId;

    if (!name) return res.status(400).json({ error: 'Build name is required' });
    if (!buildParts || !Array.isArray(buildParts) || buildParts.length === 0) {
      return res.status(400).json({ error: 'At least one part is required' });
    }

    let totalPrice = 0;
    for (const bp of buildParts) {
      const partResult = await pool.query('SELECT price FROM parts WHERE id = ?', [bp.part_id]);
      if (partResult.rows && partResult.rows.length > 0) {
        totalPrice += parseFloat(partResult.rows[0].price) * (bp.quantity || 1);
      }
    }

    const result = await pool.query(
      'INSERT INTO builds (user_id, name, description, is_public, total_price) VALUES (?, ?, ?, ?, ?)',
      [userId, name, description || null, is_public ? 1 : 0, totalPrice]
    );

    const buildId = result.insertId;

    for (const bp of buildParts) {
      await pool.query(
        'INSERT INTO build_parts (build_id, part_id, quantity) VALUES (?, ?, ?)',
        [buildId, bp.part_id, bp.quantity || 1]
      );
    }

    res.status(201).json({ message: 'Build created successfully', build: { id: buildId, name, total_price: totalPrice } });
  } catch (error) {
    sendServerError(res, error);
  }
};

// Update build
exports.updateBuild = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_public, parts: buildParts } = req.body;
    const userId = req.userId;

    const buildCheck = await pool.query('SELECT user_id FROM builds WHERE id = ?', [id]);
    if (!buildCheck.rows || buildCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Build not found' });
    }
    if (buildCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (buildParts && Array.isArray(buildParts)) {
      let totalPrice = 0;
      for (const bp of buildParts) {
        const partResult = await pool.query('SELECT price FROM parts WHERE id = ?', [bp.part_id]);
        if (partResult.rows && partResult.rows.length > 0) {
          totalPrice += parseFloat(partResult.rows[0].price) * (bp.quantity || 1);
        }
      }

      await pool.query('DELETE FROM build_parts WHERE build_id = ?', [id]);
      for (const bp of buildParts) {
        await pool.query('INSERT INTO build_parts (build_id, part_id, quantity) VALUES (?, ?, ?)',
          [id, bp.part_id, bp.quantity || 1]);
      }

      await pool.query(
        'UPDATE builds SET name = COALESCE(?, name), description = COALESCE(?, description), is_public = COALESCE(?, is_public), total_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, description, is_public !== undefined ? (is_public ? 1 : 0) : null, totalPrice, id]
      );
    } else {
      await pool.query(
        'UPDATE builds SET name = COALESCE(?, name), description = COALESCE(?, description), is_public = COALESCE(?, is_public), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, description, is_public !== undefined ? (is_public ? 1 : 0) : null, id]
      );
    }

    res.json({ message: 'Build updated successfully' });
  } catch (error) {
    sendServerError(res, error);
  }
};

// Delete build
exports.deleteBuild = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const buildCheck = await pool.query('SELECT user_id FROM builds WHERE id = ?', [id]);
    if (!buildCheck.rows || buildCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Build not found' });
    }
    if (buildCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM builds WHERE id = ?', [id]);
    res.json({ message: 'Build deleted successfully' });
  } catch (error) {
    sendServerError(res, error);
  }
};

// Like build
exports.likeBuild = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    try {
      await pool.query('INSERT INTO build_likes (build_id, user_id) VALUES (?, ?)', [id, userId]);
    } catch (e) {
      if (!e.message.includes('UNIQUE constraint')) throw e;
    }

    const countResult = await pool.query('SELECT COUNT(*) as cnt FROM build_likes WHERE build_id = ?', [id]);
    res.json({ message: 'Build liked', likes_count: countResult.rows[0].cnt });
  } catch (error) {
    sendServerError(res, error);
  }
};

// Unlike build
exports.unlikeBuild = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    await pool.query('DELETE FROM build_likes WHERE build_id = ? AND user_id = ?', [id, userId]);
    const countResult = await pool.query('SELECT COUNT(*) as cnt FROM build_likes WHERE build_id = ?', [id]);
    res.json({ message: 'Build unliked', likes_count: countResult.rows[0].cnt });
  } catch (error) {
    sendServerError(res, error);
  }
};

// Add comment
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const result = await pool.query(
      'INSERT INTO build_comments (build_id, user_id, content) VALUES (?, ?, ?)',
      [id, userId, content.trim()]
    );

    const username = await pool.query('SELECT username FROM users WHERE id = ?', [userId]);

    res.status(201).json({
      id: result.insertId,
      build_id: parseInt(id),
      user_id: userId,
      content: content.trim(),
      username: username.rows[0].username,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// Check compatibility
exports.checkBuildCompatibility = async (req, res) => {
  try {
    const { parts: buildParts } = req.body;
    if (!buildParts || !Array.isArray(buildParts) || buildParts.length === 0) {
      return res.status(400).json({ error: 'Parts array is required' });
    }
    const result = await checkCompatibility(pool, buildParts);
    res.json(result);
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.getBuildIntelligence = async (req, res) => {
  try {
    const { parts: buildParts, hours_per_day = 4 } = req.body;
    if (!buildParts || !Array.isArray(buildParts) || buildParts.length === 0) {
      return res.status(400).json({ error: 'Parts array is required' });
    }
    const partsMap = await getBuildPartsMap(pool, buildParts);
    const intelligence = calculateIntelligence(partsMap, hours_per_day);
    res.json(intelligence);
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.crossMatchBuildParts = async (req, res) => {
  try {
    const { parts: buildParts } = req.body;
    if (!buildParts || !Array.isArray(buildParts) || buildParts.length === 0) {
      return res.status(400).json({ error: 'Parts array is required' });
    }
    const matchResults = await crossMatchMarketplace(pool, buildParts);
    res.json(matchResults);
  } catch (error) {
    sendServerError(res, error);
  }
};

// Get user builds
exports.getUserBuilds = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    let query = `
      SELECT b.*, u.username as author_name,
        (SELECT COUNT(*) FROM build_likes bl WHERE bl.build_id = b.id) as likes_count,
        (SELECT COUNT(*) FROM build_comments bc WHERE bc.build_id = b.id) as comments_count
      FROM builds b JOIN users u ON b.user_id = u.id
      WHERE b.user_id = ?
    `;
    const params = [userId];

    if (currentUserId !== parseInt(userId)) {
      query += ' AND b.is_public = 1';
    }

    query += ' ORDER BY b.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (error) {
    sendServerError(res, error);
  }
};

// === AUTO BUILD SOLVER & UTILITIES ===

const CPU_PERF = {
  'i3-12100F': { score: 14000, normalized: 35 },
  'Ryzen 5 5600X': { score: 22000, normalized: 55 },
  'i5-12400F': { score: 19500, normalized: 50 },
  'Ryzen 5 7600X': { score: 28500, normalized: 70 },
  'Ryzen 7 5800X3D': { score: 28000, normalized: 75 },
  'i5-13600K': { score: 38000, normalized: 80 },
  'Ryzen 7 7800X3D': { score: 34000, normalized: 90 },
  'i7-13700K': { score: 46500, normalized: 92 },
  'Ryzen 9 7950X': { score: 63000, normalized: 98 },
  'i9-13900K': { score: 59000, normalized: 100 }
};

const GPU_PERF = {
  'RX 6650 XT': { score: 16000, normalized: 40 },
  'RTX 4060': { score: 19500, normalized: 50 },
  'RTX 4060 Ti': { score: 22500, normalized: 60 },
  'RX 7800 XT': { score: 26000, normalized: 75 },
  'RTX 4070': { score: 27000, normalized: 80 },
  'RX 7900 XTX': { score: 31000, normalized: 90 },
  'RTX 4080': { score: 35000, normalized: 92 },
  'RTX 4090': { score: 39000, normalized: 100 }
};

function getCpuPerformance(part) {
  const model = part.model || '';
  const name = part.name || '';
  for (const key in CPU_PERF) {
    if (model.includes(key) || name.includes(key)) {
      return { name: part.name, ...CPU_PERF[key] };
    }
  }
  const price = part.price || 0;
  return { name: part.name, score: Math.round(price * 2.5), normalized: Math.min(100, Math.round(price / 250)) };
}

function getGpuPerformance(part) {
  if (!part) return { name: 'Integrated Graphics', score: 0, normalized: 25 };
  const model = part.model || '';
  const name = part.name || '';
  for (const key in GPU_PERF) {
    if (model.includes(key) || name.includes(key)) {
      return { name: part.name, ...GPU_PERF[key] };
    }
  }
  const price = part.price || 0;
  return { name: part.name, score: Math.round(price * 0.5), normalized: Math.min(100, Math.round(price / 800)) };
}

function parseSpecsJson(specs) {
  if (typeof specs === 'string') {
    try { return JSON.parse(specs); } catch { return {}; }
  }
  return specs || {};
}

exports.autoBuild = async (req, res) => {
  try {
    const { budget: reqBudget, useCase } = req.body;
    const budget = parseFloat(reqBudget);

    if (isNaN(budget) || budget <= 0) {
      return res.status(400).json({ error: 'กรุณาระบุงบประมาณที่ถูกต้อง' });
    }

    if (!useCase) {
      return res.status(400).json({ error: 'กรุณาระบุลักษณะการใช้งาน' });
    }

    // 1. Fetch all active parts from database
    const partsResult = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM parts p JOIN categories c ON p.category_id = c.id
       WHERE p.is_active = 1`
    );
    const partsList = (partsResult.rows || []).map(p => ({
      ...p,
      specs: parseSpecsJson(p.specs)
    }));

    // 2. Fetch cheapest active product listings for pricing overrides
    const productsResult = await pool.query(
      `SELECT part_id, MIN(price) as min_price, COUNT(*) as count 
       FROM products 
       WHERE status = 'active' AND review_status = 'approved' AND stock_quantity > 0 
       GROUP BY part_id`
    );
    const marketplacePrices = {};
    const marketplaceCounts = {};
    (productsResult.rows || []).forEach(row => {
      marketplacePrices[row.part_id] = parseFloat(row.min_price);
      marketplaceCounts[row.part_id] = parseInt(row.count);
    });

    // Helper to get actual price (second-hand cheapest, or fallback to catalog price)
    function getActualPrice(part) {
      if (marketplacePrices[part.id] !== undefined) {
        return marketplacePrices[part.id];
      }
      return parseFloat(part.price);
    }

    // Group parts by category
    const categories = {};
    partsList.forEach(p => {
      const cat = p.category_slug;
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(p);
    });

    const cpus = categories['cpu'] || [];
    const gpus = categories['gpu'] || [];
    const motherboards = categories['motherboard'] || [];
    const rams = categories['ram'] || [];
    const storages = categories['storage'] || [];
    const psus = categories['psu'] || [];
    const cases = categories['case'] || [];
    const coolers = categories['cpu-cooler'] || [];

    const candidates = [];

    // Loop through CPUs & GPUs
    for (const cpu of cpus) {
      const cpuPrice = getActualPrice(cpu);
      const cpuPerf = getCpuPerformance(cpu);

      // GPU choices: can be none if useCase is general and CPU has integrated graphics
      const gpuOptions = [...gpus];
      const hasIntegrated = cpu.specs.integrated_graphics === true || cpu.specs.integrated_graphics === 'true';
      if (useCase === 'general' && hasIntegrated) {
        gpuOptions.unshift(null); // Add null option for integrated graphics
      }

      for (const gpu of gpuOptions) {
        const gpuPrice = gpu ? getActualPrice(gpu) : 0;
        const gpuPerf = getGpuPerformance(gpu);

        // Check bottleneck
        const diff = cpuPerf.normalized - gpuPerf.normalized;
        let bottleneckType = 'none';
        let bottleneckPct = 0;
        let bottleneckMsg = 'ไม่มีปัญหาคอขวด (ประสิทธิภาพเหมาะสมกันดี)';
        let bottleneckSolution = '';

        if (diff < -15) {
          bottleneckType = 'cpu';
          bottleneckPct = Math.min(100, Math.round((Math.abs(diff) - 15) * 2.5 + 10));
          bottleneckMsg = `CPU มีประสิทธิภาพต่ำเกินไปสำหรับ GPU รุ่นนี้ (คอขวดที่ CPU ${bottleneckPct}%)`;
          bottleneckSolution = `แนะนำให้อัปเกรด CPU หรือลดรุ่นการ์ดจอลงเพื่อให้ระบบทำงานได้สมดุล`;
        } else if (diff > 25 && gpu) {
          bottleneckType = 'gpu';
          bottleneckPct = Math.min(100, Math.round((diff - 25) * 2.0 + 10));
          bottleneckMsg = `GPU มีประสิทธิภาพต่ำเกินไปสำหรับ CPU รุ่นนี้ (คอขวดที่ GPU ${bottleneckPct}%)`;
          bottleneckSolution = `แนะนำให้อัปเกรด GPU หรือลดรุ่น CPU ลงเพื่อให้ระบบทำงานได้สมดุล`;
        }

        // If severe bottleneck, skip this pair
        if (bottleneckPct > 35) continue;

        // Filter compatible other parts
        // Motherboards compatibility: matching socket
        const compMotherboards = motherboards.filter(mb => mb.specs.socket === cpu.specs.socket);
        if (compMotherboards.length === 0) continue;

        // PSU compatibility: estimate TDP
        const cpuTdp = cpu.specs.tdp || 65;
        const gpuTdp = gpu ? (gpu.specs.tdp || 150) : 0;
        const systemTdp = cpuTdp + gpuTdp + 100;
        const reqPsuWattage = Math.ceil(systemTdp * 1.25); // 20-30% buffer (average 25%)
        const compPsus = psus.filter(psu => psu.specs.wattage >= reqPsuWattage);
        if (compPsus.length === 0) continue;

        // Case compatibility
        const compCases = cases.filter(c => {
          if (gpu) {
            const gpuLen = gpu.specs.length_mm || 250;
            const maxGpu = c.specs.max_gpu_length_mm || 300;
            if (gpuLen > maxGpu) return false;
          }
          return true;
        });
        if (compCases.length === 0) continue;

        // 1. CHEAPEST setup (select cheapest compatible parts in all other categories)
        let cheapestMb = compMotherboards.reduce((a, b) => getActualPrice(a) < getActualPrice(b) ? a : b);
        let cheapestRams = rams.filter(r => r.specs.type === cheapestMb.specs.ram_type);
        if (cheapestRams.length === 0) continue;
        let cheapestRam = cheapestRams.reduce((a, b) => getActualPrice(a) < getActualPrice(b) ? a : b);

        // Re-filter components based on MB form factor compat with Case form factor
        const mbFF = cheapestMb.specs.form_factor;
        const compCasesForMb = compCases.filter(c => {
          const compatibleFF = { ATX: ['ATX', 'mATX', 'ITX'], mATX: ['mATX', 'ITX'], ITX: ['ITX'] };
          return compatibleFF[c.specs.form_factor]?.includes(mbFF);
        });
        if (compCasesForMb.length === 0) continue;

        let cheapestCase = compCasesForMb.reduce((a, b) => getActualPrice(a) < getActualPrice(b) ? a : b);

        // Re-filter cooler based on case height clearance
        const compCoolers = coolers.filter(cooler => {
          if (cooler.specs.type === 'aio') {
            const radiator = cooler.specs.radiator_mm || 240;
            const support = cheapestCase.specs.radiator_support || '';
            const sizes = support.split('/').map(s => parseInt(s) || 0);
            return sizes.includes(radiator);
          } else {
            const height = cooler.specs.height_mm || 150;
            const maxH = cheapestCase.specs.max_cooler_height_mm || 160;
            return height <= maxH;
          }
        });
        if (compCoolers.length === 0) continue;

        let cheapestCooler = compCoolers.reduce((a, b) => getActualPrice(a) < getActualPrice(b) ? a : b);
        let cheapestPsu = compPsus.reduce((a, b) => getActualPrice(a) < getActualPrice(b) ? a : b);
        let cheapestStorage = storages.reduce((a, b) => getActualPrice(a) < getActualPrice(b) ? a : b);

        const cheapestBuildParts = [
          cpu, cheapestMb, cheapestRam, cheapestPsu, cheapestCase, cheapestCooler, cheapestStorage
        ];
        if (gpu) cheapestBuildParts.push(gpu);

        const cheapestPrice = cheapestBuildParts.reduce((sum, p) => sum + getActualPrice(p), 0);

        if (cheapestPrice <= budget) {
          candidates.push({
            type: 'cheapest',
            parts: cheapestBuildParts,
            price: cheapestPrice,
            performanceScore: cpuPerf.score + gpuPerf.score,
            valueScore: (cpuPerf.score + gpuPerf.score) / cheapestPrice,
            bottleneck: { type: bottleneckType, percentage: bottleneckPct, message: bottleneckMsg, solution: bottleneckSolution }
          });
        }

        // 2. BEST VALUE Setup (select solid value components e.g. 16GB RAM, B-series chipsets, NVMe SSD)
        let valueMb = compMotherboards.find(mb => mb.specs.chipset.startsWith('B') || mb.specs.chipset.startsWith('X') || mb.specs.chipset.startsWith('Z')) || cheapestMb;
        let valueRams = rams.filter(r => r.specs.type === valueMb.specs.ram_type && r.specs.capacity_gb >= 16);
        let valueRam = valueRams.length > 0 ? valueRams.reduce((a, b) => getActualPrice(a) < getActualPrice(b) ? a : b) : cheapestRam;
        
        let valueStorage = storages.find(s => s.specs.interface === 'NVMe' && s.specs.capacity_gb >= 1000) || cheapestStorage;
        let valuePsu = compPsus.find(p => p.specs.efficiency === '80+ Gold') || cheapestPsu;

        const valueMBFF = valueMb.specs.form_factor;
        const valueCompCases = compCases.filter(c => {
          const compatibleFF = { ATX: ['ATX', 'mATX', 'ITX'], mATX: ['mATX', 'ITX'], ITX: ['ITX'] };
          return compatibleFF[c.specs.form_factor]?.includes(valueMBFF);
        });
        let valueCase = valueCompCases.length > 0 ? valueCompCases.reduce((a, b) => getActualPrice(a) < getActualPrice(b) ? a : b) : cheapestCase;

        const valueCompCoolers = coolers.filter(cooler => {
          if (cooler.specs.type === 'aio') {
            const radiator = cooler.specs.radiator_mm || 240;
            const support = valueCase.specs.radiator_support || '';
            const sizes = support.split('/').map(s => parseInt(s) || 0);
            return sizes.includes(radiator);
          } else {
            const height = cooler.specs.height_mm || 150;
            const maxH = valueCase.specs.max_cooler_height_mm || 160;
            return height <= maxH;
          }
        });
        let valueCooler = valueCompCoolers.length > 0 ? valueCompCoolers.find(c => c.specs.tdp_rating >= 180) || cheapestCooler : cheapestCooler;

        const valueBuildParts = [
          cpu, valueMb, valueRam, valuePsu, valueCase, valueCooler, valueStorage
        ];
        if (gpu) valueBuildParts.push(gpu);

        const valuePrice = valueBuildParts.reduce((sum, p) => sum + getActualPrice(p), 0);
        if (valuePrice <= budget) {
          candidates.push({
            type: 'value',
            parts: valueBuildParts,
            price: valuePrice,
            performanceScore: cpuPerf.score + gpuPerf.score,
            valueScore: (cpuPerf.score + gpuPerf.score) / valuePrice,
            bottleneck: { type: bottleneckType, percentage: bottleneckPct, message: bottleneckMsg, solution: bottleneckSolution }
          });
        }

        // 3. MAX PERFORMANCE Setup (select highest spec compatible components)
        let maxMb = compMotherboards.find(mb => mb.specs.chipset.startsWith('Z') || mb.specs.chipset.startsWith('X')) || valueMb;
        let maxRams = rams.filter(r => r.specs.type === maxMb.specs.ram_type && r.specs.capacity_gb >= 32);
        let maxRam = maxRams.length > 0 ? maxRams.reduce((a, b) => getActualPrice(a) > getActualPrice(b) ? a : b) : valueRam;

        let maxStorage = storages.filter(s => s.specs.capacity_gb >= 1000).reduce((a, b) => getActualPrice(a) > getActualPrice(b) ? a : b, valueStorage);
        let maxPsu = compPsus.reduce((a, b) => getActualPrice(a) > getActualPrice(b) ? a : b, valuePsu);

        const maxMBFF = maxMb.specs.form_factor;
        const maxCompCases = compCases.filter(c => {
          const compatibleFF = { ATX: ['ATX', 'mATX', 'ITX'], mATX: ['mATX', 'ITX'], ITX: ['ITX'] };
          return compatibleFF[c.specs.form_factor]?.includes(maxMBFF);
        });
        let maxCase = maxCompCases.length > 0 ? maxCompCases.reduce((a, b) => getActualPrice(a) > getActualPrice(b) ? a : b, valueCase) : valueCase;

        const maxCompCoolers = coolers.filter(cooler => {
          if (cooler.specs.type === 'aio') {
            const radiator = cooler.specs.radiator_mm || 240;
            const support = maxCase.specs.radiator_support || '';
            const sizes = support.split('/').map(s => parseInt(s) || 0);
            return sizes.includes(radiator);
          } else {
            const height = cooler.specs.height_mm || 150;
            const maxH = maxCase.specs.max_cooler_height_mm || 160;
            return height <= maxH;
          }
        });
        let maxCooler = maxCompCoolers.length > 0 ? maxCompCoolers.reduce((a, b) => getActualPrice(a) > getActualPrice(b) ? a : b, valueCooler) : valueCooler;

        const maxBuildParts = [
          cpu, maxMb, maxRam, maxPsu, maxCase, maxCooler, maxStorage
        ];
        if (gpu) maxBuildParts.push(gpu);

        const maxPrice = maxBuildParts.reduce((sum, p) => sum + getActualPrice(p), 0);
        if (maxPrice <= budget) {
          candidates.push({
            type: 'max',
            parts: maxBuildParts,
            price: maxPrice,
            performanceScore: cpuPerf.score + gpuPerf.score,
            valueScore: (cpuPerf.score + gpuPerf.score) / maxPrice,
            bottleneck: { type: bottleneckType, percentage: bottleneckPct, message: bottleneckMsg, solution: bottleneckSolution }
          });
        }
      }
    }

    if (candidates.length === 0) {
      return res.status(404).json({ error: 'ไม่พบชุดอุปกรณ์คอมพิวเตอร์ที่จัดร่วมกันได้ภายใต้งบประมาณนี้ แนะนำให้เลือกเพิ่มงบประมาณ หรือปรับเปลี่ยนลักษณะการใช้งาน' });
    }

    // Get best Cheapest option
    const cheapestCandidates = candidates.filter(c => c.type === 'cheapest');
    let bestCheapest = cheapestCandidates.length > 0 ? cheapestCandidates.reduce((a, b) => a.price < b.price ? a : b) : candidates.reduce((a, b) => a.price < b.price ? a : b);

    // Get best Value option
    const valueCandidates = candidates.filter(c => c.type === 'value');
    let bestValue = valueCandidates.length > 0 ? valueCandidates.reduce((a, b) => a.valueScore > b.valueScore ? a : b) : bestCheapest;

    // Get best Max performance option
    const maxCandidates = candidates.filter(c => c.type === 'max');
    let bestMax = maxCandidates.length > 0 ? maxCandidates.reduce((a, b) => a.performanceScore > b.performanceScore ? a : b) : bestValue;

    const buildOptions = [];

    const formatBuild = (cand, label, desc) => {
      const formattedParts = cand.parts.map(p => {
        const isAvail = marketplacePrices[p.id] !== undefined;
        return {
          id: p.id,
          name: p.name,
          brand: p.brand,
          model: p.model,
          specs: p.specs,
          price: p.price,
          category_id: p.category_id,
          category_slug: p.category_slug,
          category_name: p.category_name,
          image_url: p.image_url,
          actual_price: getActualPrice(p),
          price_type: isAvail ? 'marketplace' : 'msrp',
          available: isAvail,
          seller_name: isAvail ? 'ผู้ขายในระบบ' : null,
          listing_count: marketplaceCounts[p.id] || 0
        };
      });

      return {
        label,
        description: desc,
        price: cand.price,
        performanceScore: cand.performanceScore,
        bottleneck: cand.bottleneck,
        parts: formattedParts
      };
    };

    buildOptions.push(formatBuild(bestCheapest, 'ประหยัดสุดในงบ', 'ชุดประกอบระดับเริ่มต้นที่เน้นประหยัดงบที่สุด ใช้งานได้จริงและเข้ากันได้ 100%'));
    buildOptions.push(formatBuild(bestValue, 'คุ้มที่สุด (แนะนำ)', 'จัดงบสัดส่วน CPU/GPU คุ้มที่สุดต่อบาท ได้ประสิทธิภาพคุ้มค่ากับเงินที่จ่ายไปมากที่สุด'));
    buildOptions.push(formatBuild(bestMax, 'แรงที่สุดในงบ', 'ดึงประสิทธิภาพดิบของ CPU และ GPU ออกมาแรงสุดกู่ภายใต้งบของคุณ'));

    res.json({ options: buildOptions });
  } catch (error) {
    sendServerError(res, error);
  }
};
