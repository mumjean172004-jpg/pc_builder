/**
 * PC Builder Pro — Compatibility Checking Service (Product-Centric)
 *
 * Checks compatibility directly between selected real marketplace products (`products`)
 * using typed spec_* tables keyed by `product_id`.
 */

const { assembleSpecs } = require('./specTables');

const SOCKET_CHIPSET_MAP = {
  LGA1851: ['Z890', 'B860', 'H810'],
  LGA1700: ['B660', 'B760', 'Z690', 'Z790', 'H610', 'H770'],
  LGA1200: ['Z590', 'B560', 'H510', 'H570', 'Q570', 'W580'],
  LGA1151: ['Z390', 'Z370', 'B365', 'B360', 'H370', 'H310'],
  AM5: ['A620', 'B650', 'B650E', 'X670', 'X670E', 'X870', 'X870E'],
  AM4: ['A320', 'B350', 'B450', 'B550', 'X370', 'X470', 'X570', 'A520'],
};

async function getBuildPartsMap(pool, buildParts) {
  const partsMap = {};

  for (const bp of buildParts) {
    const productId = bp.product_id || bp.id;
    const result = await pool.query(
      `SELECT pr.id AS product_id, pr.price, pr.original_price, pr.brand, pr.model,
              pr.description AS name, c.slug AS category_slug, c.name AS category_name
       FROM products pr
       JOIN categories c ON pr.category_id = c.id
       WHERE pr.id = ? AND pr.status = 'active'`,
      [productId]
    );
    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0];
      const category = row.category_slug;
      const specs = await assembleSpecs(pool, category, row.product_id);
      if (!partsMap[category]) {
        partsMap[category] = [];
      }
      partsMap[category].push({ ...row, id: row.product_id, quantity: bp.quantity || 1, specs });
    }
  }

  return partsMap;
}

async function checkCompatibility(pool, buildParts) {
  const warnings = [];
  const errors = [];

  const parts = await getBuildPartsMap(pool, buildParts);

  const cpu = parts.cpu?.[0];
  const motherboard = parts.motherboard?.[0];
  const ram = parts.ram || [];

  // 1. CPU ↔ Motherboard socket
  if (cpu && motherboard) {
    const cpuSocket = cpu.specs?.socket;
    const mbSocket = motherboard.specs?.socket;
    const mbChipset = motherboard.specs?.chipset;

    if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
      errors.push(`Socket ของ CPU (${cpuSocket}) ไม่ตรงกับ Socket ของ Motherboard (${mbSocket}). วิธีแก้: กรุณาเปลี่ยน CPU ให้ใช้ socket เดียวกันกับ Motherboard หรือเลือก Motherboard ที่มี socket ตรงกันกับ CPU (เช่น ${cpuSocket})`);
    } else if (cpuSocket && mbChipset) {
      const supportedChipsets = SOCKET_CHIPSET_MAP[cpuSocket] || [];
      if (!supportedChipsets.includes(mbChipset)) {
        warnings.push(`ชิปเซ็ต ${mbChipset} อาจไม่รองรับ ${cpu.brand || ''} ${cpu.model || cpu.name} อย่างสมบูรณ์. วิธีแก้: แนะนำให้เลือกเมนบอร์ดที่ใช้ชิปเซ็ตที่มีประสิทธิภาพสูงกว่าหรืออัปเดต BIOS`);
      }
    }
  }

  // 2. RAM type ↔ Motherboard
  if (ram.length > 0 && motherboard) {
    const mbRamType = motherboard.specs?.ram_type;
    const mbMaxRam = motherboard.specs?.max_ram_gb;
    const mbRamSlots = motherboard.specs?.ram_slots;
    let totalRamCapacity = 0;
    let totalModules = 0;

    for (const r of ram) {
      const ramType = r.specs?.type;
      if (ramType && mbRamType && ramType !== mbRamType) {
        errors.push(`ชนิดของ RAM (${ramType}) ไม่ตรงกับชนิดที่ Motherboard รองรับ (${mbRamType}). วิธีแก้: เปลี่ยนชนิด RAM ให้เป็น ${mbRamType} หรือเลือก Motherboard ที่รองรับ RAM ${ramType}`);
      }
      totalRamCapacity += (r.specs?.capacity_gb || 0) * (r.quantity || 1);
      totalModules += (r.specs?.modules || 2) * (r.quantity || 1);
    }

    if (mbMaxRam && totalRamCapacity > mbMaxRam) {
      warnings.push(`ความจุ RAM รวม (${totalRamCapacity}GB) เกินขีดจำกัดที่ Motherboard รองรับได้สูงสุด (${mbMaxRam}GB). วิธีแก้: ลดจำนวน RAM หรือความจุลงให้อยู่ในเกณฑ์ที่เหมาะสม`);
    }
    if (mbRamSlots && totalModules > mbRamSlots) {
      warnings.push(`จำนวนแถวของ RAM (${totalModules} แถว) เกินช่องเสียบบน Motherboard (${mbRamSlots} ช่อง). วิธีแก้: ลดจำนวนแถว RAM ลง หรือเลือกแถวที่มีความจุต่อแถวสูงขึ้นแทนเพื่อลดจำนวนแถว`);
    }
  }

  return { compatible: errors.length === 0, warnings, errors };
}

/**
 * Cross-matches picked listings against cheaper alternatives for the same model
 */
async function crossMatchMarketplace(pool, buildParts) {
  const matches = [];
  let totalNewPrice = 0;
  let totalSecondHandPrice = 0;

  for (const bp of buildParts) {
    const productId = bp.product_id || bp.id;
    const productRes = await pool.query(
      `SELECT pr.id, pr.price AS picked_price, pr.original_price, pr.brand, pr.model,
              pr.description, c.name AS category_name, c.slug AS category_slug
       FROM products pr
       JOIN categories c ON pr.category_id = c.id
       WHERE pr.id = ?`,
      [productId]
    );

    if (productRes.rows?.length > 0) {
      const picked = productRes.rows[0];
      const qty = bp.quantity || 1;
      const catalogPrice = Number(picked.original_price || picked.picked_price);
      totalNewPrice += catalogPrice * qty;

      // Find other active listings of the same model
      const listingsRes = await pool.query(`
        SELECT p.*, u.username as seller_name
        FROM products p
        JOIN users u ON p.seller_id = u.id
        WHERE p.model = ? AND p.id != ? AND p.status = 'active' AND p.review_status = 'approved'
        ORDER BY p.price ASC
        LIMIT 3
      `, [picked.model, picked.id]);

      const matchedListings = listingsRes.rows || [];
      const lowestListing = matchedListings[0];
      const bestPrice = lowestListing ? lowestListing.price * qty : picked.picked_price * qty;
      totalSecondHandPrice += bestPrice;

      matches.push({
        product_id: picked.id,
        part_name: `${picked.brand} ${picked.model}`,
        brand: picked.brand,
        model: picked.model,
        category_name: picked.category_name,
        new_price: catalogPrice,
        quantity: qty,
        has_secondhand: matchedListings.length > 0,
        lowest_secondhand_price: lowestListing ? lowestListing.price : null,
        savings_per_unit: lowestListing ? Math.max(0, picked.picked_price - lowestListing.price) : 0,
        available_listings: matchedListings.map(l => ({
          id: l.id,
          price: l.price,
          condition: l.condition,
          seller_name: l.seller_name,
          remaining_warranty_months: l.remaining_warranty_months
        }))
      });
    }
  }

  const potentialSavings = Math.max(0, totalNewPrice - totalSecondHandPrice);

  return {
    totalNewPrice,
    totalSecondHandPrice,
    potentialSavings,
    savingsPercentage: totalNewPrice > 0 ? Math.round((potentialSavings / totalNewPrice) * 100) : 0,
    matches
  };
}

module.exports = {
  checkCompatibility,
  getBuildPartsMap,
  crossMatchMarketplace
};
