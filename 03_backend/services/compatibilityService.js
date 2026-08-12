/**
 * PC Builder Pro — Compatibility Checking Service
 */

const SOCKET_CHIPSET_MAP = {
  LGA1700: ['B660', 'B760', 'Z690', 'Z790', 'H610', 'H670'],
  AM4: ['A320', 'B350', 'B450', 'B550', 'X370', 'X470', 'X570', 'A520'],
  AM5: ['A620', 'B650', 'B650E', 'X670', 'X670E'],
};

function parseSpecs(part) {
  if (typeof part.specs === 'string') {
    try { return JSON.parse(part.specs); } catch { return {}; }
  }
  return part.specs || {};
}

async function getBuildPartsMap(pool, buildParts) {
  const partsMap = {};

  for (const bp of buildParts) {
    const result = await pool.query(
      'SELECT p.*, c.slug as category_slug FROM parts p JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
      [bp.part_id]
    );
    if (result.rows && result.rows.length > 0) {
      const part = result.rows[0];
      const category = part.category_slug;
      if (!partsMap[category]) {
        partsMap[category] = [];
      }
      partsMap[category].push({ ...part, quantity: bp.quantity, specs: parseSpecs(part) });
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
  const gpu = parts.gpu || [];
  const psu = parts.psu?.[0];
  const case_ = parts.case?.[0];
  const cooler = parts['cpu-cooler']?.[0];

  // 1. CPU ↔ Motherboard socket
  if (cpu && motherboard) {
    const cpuSocket = cpu.specs.socket;
    const mbSocket = motherboard.specs.socket;
    const mbChipset = motherboard.specs.chipset;

    if (cpuSocket !== mbSocket) {
      errors.push(`Socket ของ CPU (${cpuSocket}) ไม่ตรงกับ Socket ของ Motherboard (${mbSocket}). วิธีแก้: กรุณาเปลี่ยน CPU ให้ใช้ socket เดียวกันกับ Motherboard หรือเลือก Motherboard ที่มี socket ตรงกันกับ CPU (เช่น ${cpuSocket})`);
    } else {
      const supportedChipsets = SOCKET_CHIPSET_MAP[cpuSocket] || [];
      if (!supportedChipsets.includes(mbChipset)) {
        warnings.push(`ชิปเซ็ต ${mbChipset} อาจไม่รองรับ ${cpu.name} อย่างสมบูรณ์. วิธีแก้: แนะนำให้เลือกเมนบอร์ดที่ใช้ชิปเซ็ตที่มีประสิทธิภาพสูงกว่าหรืออัปเดต BIOS`);
      }
    }
  }

  // 2. RAM type ↔ Motherboard
  if (ram.length > 0 && motherboard) {
    const mbRamType = motherboard.specs.ram_type;
    const mbMaxRam = motherboard.specs.max_ram_gb;
    const mbRamSlots = motherboard.specs.ram_slots;
    let totalRamCapacity = 0;
    let totalModules = 0;

    for (const r of ram) {
      const ramType = r.specs.type;
      if (ramType !== mbRamType) {
        errors.push(`ชนิดของ RAM (${ramType}) ไม่ตรงกับชนิดที่ Motherboard รองรับ (${mbRamType}). วิธีแก้: เปลี่ยนชนิด RAM ให้เป็น ${mbRamType} หรือเลือก Motherboard ที่รองรับ RAM ${ramType}`);
      }
      totalRamCapacity += (r.specs.capacity_gb || 0) * r.quantity;
      totalModules += (r.specs.modules || 2) * r.quantity;
    }

    if (totalRamCapacity > mbMaxRam) {
      warnings.push(`ความจุ RAM รวม (${totalRamCapacity}GB) เกินขีดจำกัดที่ Motherboard รองรับได้สูงสุด (${mbMaxRam}GB). วิธีแก้: ลดจำนวน RAM หรือความจุลงให้อยู่ในเกณฑ์ที่เหมาะสม`);
    }
    if (totalModules > mbRamSlots) {
      warnings.push(`จำนวนแถวของ RAM (${totalModules} แถว) เกินช่องเสียบบน Motherboard (${mbRamSlots} ช่อง). วิธีแก้: ลดจำนวนแถว RAM ลง หรือเลือกแถวที่มีความจุต่อแถวสูงขึ้นแทนเพื่อลดจำนวนแถว`);
    }
  }

  // 3. GPU length ↔ Case
  if (gpu.length > 0 && case_) {
    const maxGpuLength = case_.specs.max_gpu_length_mm;
    for (const g of gpu) {
      const gpuLength = g.specs.length_mm;
      if (gpuLength > maxGpuLength) {
        errors.push(`การ์ดจอ "${g.name}" ยาว (${gpuLength} มม.) เกินกว่าขนาดสูงสุดที่ Case "${case_.name}" รองรับได้ (สูงสุด ${maxGpuLength} มม.). วิธีแก้: เลือก Case ขนาดใหญ่ขึ้น หรือเปลี่ยนไปใช้การ์ดจอที่มีขนาดความยาวสั้นลง`);
      } else if (gpuLength > maxGpuLength * 0.9) {
        warnings.push(`การ์ดจอ "${g.name}" ยาว (${gpuLength} มม.) ใกล้เคียงกับขีดจำกัดสูงสุดของเคส (${maxGpuLength} มม.) อาจทำให้ติดตั้งยากหรือชนพัดลมด้านหน้า. วิธีแก้: ตรวจสอบและย้ายพัดลมเคส หรือใช้เคสที่มีพื้นที่ยาวกว่านี้`);
      }
    }
  }

  // 4. Cooler height ↔ Case
  if (cooler && case_) {
    const coolerHeight = cooler.specs.height_mm;
    const maxCoolerHeight = case_.specs.max_cooler_height_mm;
    if (coolerHeight && maxCoolerHeight && coolerHeight > maxCoolerHeight) {
      errors.push(`พัดลม CPU "${cooler.name}" สูง (${coolerHeight} มม.) เกินกว่าขนาดความสูงที่ Case "${case_.name}" รองรับได้ (สูงสุด ${maxCoolerHeight} มม.). วิธีแก้: เลือกใช้ Case ที่กว้างขึ้น หรือเปลี่ยนพัดลม CPU ที่มีขนาดเตี้ยลง หรือเปลี่ยนไปใช้ชุดน้ำ AIO แทน`);
    }
  }

  // 5. PSU wattage
  if (psu && (cpu || gpu.length > 0)) {
    const psuWattage = psu.specs.wattage;
    let totalTdp = 0;
    if (cpu) totalTdp += cpu.specs.tdp || 0;
    for (const g of gpu) {
      totalTdp += g.specs.tdp || 0;
    }
    totalTdp += 100;
    const recommendedWattage = Math.ceil(totalTdp * 1.25); // เผื่อ 20-30% (เฉลี่ย 25%)

    if (psuWattage < totalTdp) {
      errors.push(`กำลังไฟของ PSU (${psuWattage}W) น้อยกว่ากำลังไฟขั้นต่ำรวมของทั้งระบบ (${totalTdp}W). วิธีแก้: เปลี่ยน PSU ที่มีกำลังวัตต์สูงขึ้นด่วนเพื่อความเสถียรและป้องกันความเสียหาย`);
    } else if (psuWattage < recommendedWattage) {
      warnings.push(`กำลังไฟของ PSU (${psuWattage}W) ต่ำกว่าระดับแนะนำรวมสำรองไฟ 20-30% (${recommendedWattage}W). วิธีแก้: แนะนำให้ใช้ PSU ขนาดอย่างน้อย ${recommendedWattage}W เพื่อการทำงานที่ปลอดภัยและรองรับการใช้งานหนัก`);
    }
  }

  // 6. AIO radiator support
  if (cooler && case_ && cooler.specs.type === 'aio') {
    const radiatorSize = cooler.specs.radiator_mm;
    const caseRadiatorSupport = case_.specs.radiator_support || '';
    const supportedSizes = caseRadiatorSupport.split('/').map(s => parseInt(s) || 0);
    if (!supportedSizes.includes(radiatorSize)) {
      errors.push(`Case "${case_.name}" ไม่รองรับหม้อน้ำขนาด ${radiatorSize} มม. (เคสรองรับ: ${caseRadiatorSupport}). วิธีแก้: เลือกใช้ชุดน้ำ AIO ขนาดหม้อน้ำที่เคสรองรับ หรือเปลี่ยนเคสที่ใหญ่ขึ้น`);
    }
  }

  // 7. Motherboard form factor ↔ Case
  if (motherboard && case_) {
    const mbFormFactor = motherboard.specs.form_factor;
    const caseFormFactor = case_.specs.form_factor;
    const compatible = { ATX: ['ATX', 'mATX', 'ITX'], mATX: ['mATX', 'ITX'], ITX: ['ITX'] };
    if (!compatible[caseFormFactor]?.includes(mbFormFactor)) {
      errors.push(`ขนาดของ Motherboard (${mbFormFactor}) ใหญ่เกินขนาดที่ Case "${case_.name}" ขนาด (${caseFormFactor}) จะรองรับได้. วิธีแก้: เลือก Case ขนาดใหญ่ขึ้น (เช่น ATX) หรือเปลี่ยนขนาดบอร์ดให้เล็กพอกับเคส (เช่น ${caseFormFactor})`);
    }
  }

  return { compatible: errors.length === 0, warnings, errors };
}

function calculateIntelligence(partsMap, hoursPerDay = 4) {
  const cpu = partsMap.cpu?.[0];
  const gpu = partsMap.gpu?.[0];

  // 1. TDP & Electricity calculation
  let totalTdp = 100; // Base component load (MB, RAM, SSD, fans)
  if (cpu?.specs?.tdp) totalTdp += Number(cpu.specs.tdp) || 65;
  for (const g of (partsMap.gpu || [])) {
    if (g.specs?.tdp) totalTdp += Number(g.specs.tdp) || 150;
  }

  const hours = Math.max(1, Math.min(24, Number(hoursPerDay) || 4));
  const dailyKwh = (totalTdp * hours) / 1000;
  const monthlyKwh = dailyKwh * 30;
  const ratePerKwh = 4.42; // FT electricity rate THB/kWh
  const monthlyElectricityTHB = Math.round(monthlyKwh * ratePerKwh);

  // 2. Bottleneck Analysis
  let cpuPower = cpu?.specs?.tdp || 65;
  let gpuPower = gpu?.specs?.tdp || 150;
  if (cpu?.price) cpuPower = Math.max(cpuPower, cpu.price / 100);
  if (gpu?.price) gpuPower = Math.max(gpuPower, gpu.price / 150);

  let bottleneckStatus = 'balanced';
  let bottleneckScore = 3; // 3% deviation (ideal balance)
  let bottleneckLabel = 'สมดุลยอดเยี่ยม (Great Balance)';
  let bottleneckAdvice = 'ซีพียูและในการ์ดจอมีประสิทธิภาพสอดคล้องกันดีมาก ดึงประสิทธิภาพอุปกรณ์ได้สูงสุด';

  if (cpu && gpu) {
    const ratio = gpuPower / (cpuPower || 1);
    if (ratio > 2.8) {
      bottleneckStatus = 'cpu_bottleneck';
      bottleneckScore = Math.min(35, Math.round((ratio - 2.5) * 10));
      bottleneckLabel = 'CPU Bottleneck (คอขวดที่ประมวลผลหลัก)';
      bottleneckAdvice = `การ์ดจอ (${gpu.name}) มีกำลังประมวลผลสูงกว่า CPU (${cpu.name}) เกินไป แนะนำอัปเกรด CPU เป็นรุ่นที่สูงขึ้น`;
    } else if (ratio < 0.9) {
      bottleneckStatus = 'gpu_bottleneck';
      bottleneckScore = Math.min(30, Math.round((1.2 - ratio) * 15));
      bottleneckLabel = 'GPU Bottleneck (คอขวดที่การ์ดจอ)';
      bottleneckAdvice = `CPU (${cpu.name}) มีประสิทธิภาพสูงกว่าการ์ดจอ (${gpu.name}) ค่อนข้างมาก แนะนำอัปเกรดการ์ดจอเพื่อเพิ่ม FPS ในการเล่นเกม`;
    }
  } else if (!gpu && cpu) {
    bottleneckStatus = 'gpu_bottleneck';
    bottleneckScore = 25;
    bottleneckLabel = 'ไม่มีการ์ดจอแยก (Integrated Graphics)';
    bottleneckAdvice = 'ระบบทำงานผ่าน iGPU บนตัว CPU แนะนำติดตั้งการ์ดจอแยกเพิ่มเติมเพื่อเล่นเกมระดับสูง';
  }

  // 3. Gaming FPS Estimation
  let fpsEsports1080p = 60;
  let fpsAaa1080p = 30;
  let fpsAaa1440p = 20;

  if (gpu) {
    const gpuPrice = gpu.price || 5000;
    if (gpuPrice > 35000) {
      fpsEsports1080p = 360;
      fpsAaa1080p = 165;
      fpsAaa1440p = 120;
    } else if (gpuPrice > 20000) {
      fpsEsports1080p = 240;
      fpsAaa1080p = 120;
      fpsAaa1440p = 85;
    } else if (gpuPrice > 10000) {
      fpsEsports1080p = 180;
      fpsAaa1080p = 75;
      fpsAaa1440p = 50;
    } else {
      fpsEsports1080p = 120;
      fpsAaa1080p = 45;
      fpsAaa1440p = 30;
    }
  } else if (cpu) {
    fpsEsports1080p = 75;
    fpsAaa1080p = 25;
    fpsAaa1440p = 15;
  }

  return {
    totalTdp,
    hoursPerDay: hours,
    monthlyKwh: Math.round(monthlyKwh * 10) / 10,
    monthlyElectricityTHB,
    bottleneck: {
      status: bottleneckStatus,
      score: bottleneckScore,
      label: bottleneckLabel,
      advice: bottleneckAdvice
    },
    performance: {
      esports1080p: fpsEsports1080p,
      aaa1080p: fpsAaa1080p,
      aaa1440p: fpsAaa1440p
    }
  };
}

async function crossMatchMarketplace(pool, buildParts) {
  const matches = [];
  let totalNewPrice = 0;
  let totalSecondHandPrice = 0;

  for (const bp of buildParts) {
    const partRes = await pool.query(
      'SELECT p.*, c.slug as category_slug, c.name as category_name FROM parts p JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
      [bp.part_id]
    );

    if (partRes.rows?.length > 0) {
      const part = partRes.rows[0];
      const partPrice = (part.price || 0) * bp.quantity;
      totalNewPrice += partPrice;

      // Find matched second-hand listings in products table
      const listingsRes = await pool.query(`
        SELECT p.*, u.username as seller_name
        FROM products p
        JOIN users u ON p.seller_id = u.id
        WHERE p.part_id = ? AND p.status = 'active' AND p.review_status = 'approved'
        ORDER BY p.price ASC
        LIMIT 3
      `, [part.id]);

      const matchedListings = listingsRes.rows || [];
      const lowestListing = matchedListings[0];
      const bestPrice = lowestListing ? lowestListing.price * bp.quantity : partPrice;
      totalSecondHandPrice += bestPrice;

      matches.push({
        part_id: part.id,
        part_name: part.name,
        brand: part.brand,
        model: part.model,
        category_name: part.category_name,
        new_price: part.price,
        quantity: bp.quantity,
        has_secondhand: matchedListings.length > 0,
        lowest_secondhand_price: lowestListing ? lowestListing.price : null,
        savings_per_unit: lowestListing ? Math.max(0, part.price - lowestListing.price) : 0,
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
  calculateIntelligence,
  crossMatchMarketplace
};
