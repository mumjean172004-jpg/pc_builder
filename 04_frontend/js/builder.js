/**
 * PC Builder Pro — ตรรกะของหน้าประกอบ PC
 * จัดการการเลือกอะไหล่ ตรวจสอบความเข้ากันได้ และบันทึกชุดประกอบ
 */

// lucide-style inline icons used inside dynamically-rendered template strings below.
// Path data fetched verbatim from lucide-static — do not hand-edit coordinates.
function svgIcon(paths, extraAttrs) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extraAttrs ? ' ' + extraAttrs : ''}>${paths}</svg>`;
}
const ICONS = {
  check: svgIcon('<path d="M20 6 9 17l-5-5"></path>'),
  x: svgIcon('<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>'),
  alertTriangle: svgIcon('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>'),
  search: svgIcon('<path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle>'),
  shoppingCart: svgIcon('<circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>'),
  zap: svgIcon('<path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"></path>'),
  shield: svgIcon('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>'),
  package: svgIcon('<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"></path><path d="M12 22V12"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><path d="m7.5 4.27 9 5.15"></path>'),
  arrowRight: svgIcon('<path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path>'),
  monitor: svgIcon('<rect width="20" height="14" x="2" y="3" rx="2"></rect><line x1="8" x2="16" y1="21" y2="21"></line><line x1="12" x2="12" y1="17" y2="21"></line>'),
  cpu: svgIcon('<path d="M12 20v2"></path><path d="M12 2v2"></path><path d="M17 20v2"></path><path d="M17 2v2"></path><path d="M2 12h2"></path><path d="M2 17h2"></path><path d="M2 7h2"></path><path d="M20 12h2"></path><path d="M20 17h2"></path><path d="M20 7h2"></path><path d="M7 20v2"></path><path d="M7 2v2"></path><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="8" y="8" width="8" height="8" rx="1"></rect>'),
  fan: svgIcon('<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path>'),
  motherboard: svgIcon('<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path><path d="M9 3v18"></path><path d="M15 3v18"></path>'),
  ram: svgIcon('<path d="M12 12v-2"></path><path d="M12 18v-2"></path><path d="M16 12v-2"></path><path d="M16 18v-2"></path><path d="M2 11h1.5"></path><path d="M20 18v-2"></path><path d="M20.5 11H22"></path><path d="M4 18v-2"></path><path d="M8 12v-2"></path><path d="M8 18v-2"></path><rect x="2" y="6" width="20" height="10" rx="2"></rect>'),
  gpu: svgIcon('<line x1="6" x2="10" y1="11" y2="11"></line><line x1="8" x2="8" y1="9" y2="13"></line><line x1="15" x2="15.01" y1="12" y2="12"></line><line x1="18" x2="18.01" y1="10" y2="10"></line><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"></path>'),
  storage: svgIcon('<path d="M10 16h.01"></path><path d="M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><path d="M21.946 12.013H2.054"></path><path d="M6 16h.01"></path>'),
  wrench: svgIcon('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"></path>'),
};
const ICON_SM = (name) => ICONS[name].replace('class="icon"', 'class="icon"style="width:14px;height:14px;"');

const Builder = {
  categories: [],
  parts: [],
  selectedParts: {}, // { categorySlug: วัตถุอะไหล่ }
  currentCategory: null,
  compatibility: { compatible: true, warnings: [], errors: [] },

  async init() {
    try {
      // โหลดหมวดหมู่
      this.categories = await API.get('/parts/categories');
      this.renderCategories();

      // โหลดอะไหล่ทั้งหมด
      this.parts = await API.get('/parts');

      // ตรวจสอบว่าต้องโหลดชุดประกอบที่มีอยู่ไหม
      const urlParams = new URLSearchParams(window.location.search);
      const buildId = urlParams.get('load');
      if (buildId) {
        await this.loadBuild(buildId);
      }

      this.renderSummary();
      this.checkCompatibility();
    } catch (error) {
      Toast.error('โหลดข้อมูลไม่สำเร็จ: ' + error.message);
    }
  },

  renderCategories() {
    const list = document.getElementById('category-list');
    if (!list) return;

    list.innerHTML = this.categories.map(cat => {
      const isSelected = this.selectedParts[cat.slug];
      return `
        <li class="category-item ${this.currentCategory === cat.slug ? 'active' : ''} ${isSelected ? 'has-selection' : ''}"
            data-slug="${cat.slug}">
          <span>${cat.name}</span>
          ${isSelected ? `<span class="check-icon">${ICON_SM('check')}</span>` : ''}
        </li>
      `;
    }).join('');

    list.querySelectorAll('.category-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectCategory(item.dataset.slug);
      });
    });
  },

  selectCategory(slug) {
    this.currentCategory = slug;
    this.renderCategories();
    this.renderPartsList();
  },

  renderPartsList() {
    const container = document.getElementById('parts-list');
    const title = document.getElementById('parts-panel-title');
    if (!container) return;

    const category = this.categories.find(c => c.slug === this.currentCategory);
    if (category && title) {
      title.textContent = category.name;
    }

    let filtered = this.parts.filter(p => p.category_slug === this.currentCategory);

    // กรองตามคำค้นหา
    const searchInput = document.getElementById('parts-search');
    if (searchInput && searchInput.value) {
      const q = searchInput.value.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.model && p.model.toLowerCase().includes(q))
      );
    }

    // กรองตามยี่ห้อ
    const brandFilter = document.getElementById('brand-filter');
    if (brandFilter && brandFilter.value) {
      filtered = filtered.filter(p => p.brand === brandFilter.value);
    }

    // เรียงลำดับ
    const sortFilter = document.getElementById('sort-filter');
    if (sortFilter) {
      switch (sortFilter.value) {
        case 'price-asc':
          filtered.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          filtered.sort((a, b) => b.price - a.price);
          break;
        case 'name':
          filtered.sort((a, b) => a.name.localeCompare(b.name, 'th'));
          break;
      }
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${ICONS.search}</div>
          <p>ไม่พบอะไหล่</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(part => {
      const isSelected = this.selectedParts[part.category_slug]?.id === part.id;
      const compatStatus = this.getPartCompatibilityStatus(part);

      return `
        <div class="part-item ${isSelected ? 'selected' : ''} ${compatStatus.class === 'error' ? 'incompatible' : ''}"
             data-id="${part.id}" data-category="${part.category_slug}">
          <div class="part-item-icon">${this.getCategoryIcon(part.category_slug)}</div>
          <div class="part-item-info">
            <div class="part-item-name">${escapeHtml(part.name)}</div>
            <div class="part-item-specs">${getSpecsSummary(part.specs, part.category_slug)}</div>
          </div>
          <div class="part-item-right">
            <div class="part-item-price">${formatPrice(part.price)}</div>
            <div class="part-item-brand">${escapeHtml(part.brand)}</div>
            ${compatStatus.html ? `<div class="part-item-compat ${compatStatus.class}">${compatStatus.html}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.part-item').forEach(item => {
      item.addEventListener('click', () => {
        const partId = parseInt(item.dataset.id);
        const categorySlug = item.dataset.category;
        const part = this.parts.find(p => p.id === partId);
        if (part) {
          this.selectPart(categorySlug, part);
        }
      });
    });

    // อัปเดตตัวเลือกกรองยี่ห้อ
    this.updateBrandFilter();
  },

  selectPart(categorySlug, part) {
    this.selectedParts[categorySlug] = part;
    this.renderCategories();
    this.renderPartsList();
    this.renderSummary();
    this.checkCompatibility();
  },

  removePart(categorySlug) {
    delete this.selectedParts[categorySlug];
    this.renderCategories();
    this.renderPartsList();
    this.renderSummary();
    this.checkCompatibility();
  },

  renderSummary() {
    const container = document.getElementById('summary-parts');
    if (!container) return;

    const slugs = Object.keys(this.selectedParts);

    if (slugs.length === 0) {
      container.innerHTML = '<p class="text-muted text-center" style="padding: 2rem 0;">ยังไม่ได้เลือกอะไหล่ กดที่หมวดหมู่เพื่อเริ่ม</p>';
      this.updateTotalPrice(0);
      const panel = document.getElementById('marketplace-checkout-panel');
      if (panel) panel.style.display = 'none';
      return;
    }

    let total = 0;
    let totalTdp = 0;
    let psuWattage = 0;

    container.innerHTML = slugs.map(slug => {
      const part = this.selectedParts[slug];
      total += parseFloat(part.price);
      if (part.specs.tdp) totalTdp += part.specs.tdp;
      if (part.category_slug === 'psu') psuWattage = part.specs.wattage || 0;

      return `
        <div class="summary-part" style="flex-direction: column; align-items: stretch; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="summary-part-label">
              <span>${this.getCategoryIcon(part.category_slug)}</span>
              <span class="summary-part-name" title="${escapeHtml(part.name)}">${escapeHtml(part.name)}</span>
            </div>
            <div class="flex gap-1" style="align-items: center;">
              <span class="summary-part-price">${formatPrice(part.price)}</span>
              <button class="summary-part-remove" data-slug="${part.category_slug}" title="ลบ">×</button>
            </div>
          </div>
          <div style="display: flex; gap: 6px; padding-left: 28px;">
            <a href="/products.html?search=${encodeURIComponent(part.name)}" target="_blank" class="btn btn-outline btn-sm" style="font-size: 0.7rem; padding: 2px 8px; border-color: var(--primary); color: var(--primary); display: inline-flex; align-items: center; gap: 4px;">${ICON_SM('search')} หามือสองในเว็บ</a>
            <a href="https://shopee.co.th/search?keyword=${encodeURIComponent(part.name)}" target="_blank" class="btn btn-outline btn-sm" style="font-size: 0.7rem; padding: 2px 8px; border-color: #f53d2d; color: #f53d2d; display: inline-flex; align-items: center; gap: 4px;">${ICON_SM('shoppingCart')} หาของใหม่ Shopee</a>
          </div>
        </div>
      `;
    }).join('');

    // เพิ่มปุ่มลบ
    container.querySelectorAll('.summary-part-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removePart(btn.dataset.slug);
      });
    });

    this.updateTotalPrice(total);
    this.checkMarketplaceAvailability();
  },

  updateTotalPrice(total) {
    const el = document.getElementById('summary-total-price');
    if (el) el.textContent = formatPrice(total);
  },

  async checkCompatibility() {
    const buildParts = Object.values(this.selectedParts).map(p => ({
      part_id: p.id,
      quantity: 1,
    }));

    if (buildParts.length < 2) {
      this.compatibility = { compatible: true, warnings: [], errors: [] };
      this.renderCompatibility();
      return;
    }

    try {
      this.compatibility = await API.post('/builds/compatibility', { parts: buildParts });
    } catch (error) {
      this.compatibility = { compatible: true, warnings: [], errors: [] };
    }

    this.renderCompatibility();
    this.renderPartsList(); // แสดงใหม่เพื่อแสดงสถานะความเข้ากันได้
    this.updateIntelligence();
  },

  async updateIntelligence() {
    const buildParts = Object.values(this.selectedParts).map(p => ({
      part_id: p.id,
      quantity: 1,
    }));

    const slider = document.getElementById('power-hours-slider');
    const hours = slider ? parseInt(slider.value) || 4 : 4;

    if (buildParts.length === 0) {
      this.renderIntelligenceNull(hours);
      return;
    }

    try {
      const intel = await API.post('/builds/intelligence', { parts: buildParts, hours_per_day: hours });
      this.renderIntelligence(intel);
    } catch (e) {
      console.warn('Intelligence API error:', e);
    }
  },

  renderIntelligenceNull(hours) {
    const scoreEl = document.getElementById('intel-bottleneck-score');
    const labelEl = document.getElementById('intel-bottleneck-label');
    const adviceEl = document.getElementById('intel-bottleneck-advice');
    const fpsEsports = document.getElementById('fps-esports');
    const fpsAaa1080 = document.getElementById('fps-aaa1080');
    const fpsAaa1440 = document.getElementById('fps-aaa1440');
    const costThb = document.getElementById('power-cost-thb');
    const kwhEl = document.getElementById('kwh-display');
    const hoursEl = document.getElementById('hours-display');

    if (scoreEl) scoreEl.textContent = '-';
    if (labelEl) labelEl.textContent = 'ยังไม่ได้เลือก CPU / การ์ดจอ';
    if (adviceEl) adviceEl.textContent = 'เลือกชิ้นส่วน CPU และ GPU เพื่อประเมินความสมดุลของระบบ';
    if (fpsEsports) fpsEsports.textContent = '- FPS';
    if (fpsAaa1080) fpsAaa1080.textContent = '- FPS';
    if (fpsAaa1440) fpsAaa1440.textContent = '- FPS';
    if (costThb) costThb.textContent = '~0 บาท/เดือน';
    if (kwhEl) kwhEl.textContent = '0 kWh/เดือน';
    if (hoursEl) hoursEl.textContent = `${hours} ชม./วัน`;
  },

  renderIntelligence(intel) {
    const { bottleneck, performance, monthlyElectricityTHB, monthlyKwh, hoursPerDay } = intel;

    const scoreEl = document.getElementById('intel-bottleneck-score');
    const labelEl = document.getElementById('intel-bottleneck-label');
    const adviceEl = document.getElementById('intel-bottleneck-advice');
    const fpsEsports = document.getElementById('fps-esports');
    const fpsAaa1080 = document.getElementById('fps-aaa1080');
    const fpsAaa1440 = document.getElementById('fps-aaa1440');
    const costThb = document.getElementById('power-cost-thb');
    const kwhEl = document.getElementById('kwh-display');
    const hoursEl = document.getElementById('hours-display');

    if (scoreEl) {
      scoreEl.textContent = bottleneck.score ? `${bottleneck.score}%` : 'Ideal';
      if (bottleneck.status === 'balanced') {
        scoreEl.style.background = 'rgba(16, 185, 129, 0.2)';
        scoreEl.style.color = '#34d399';
      } else {
        scoreEl.style.background = 'rgba(245, 158, 11, 0.2)';
        scoreEl.style.color = '#fbbf24';
      }
    }

    if (fpsEsports) fpsEsports.textContent = `${performance.esports1080p || '-'}+ FPS`;
    if (fpsAaa1080) fpsAaa1080.textContent = `${performance.aaa1080p || '-'} FPS`;
    if (fpsAaa1440) fpsAaa1440.textContent = `${performance.aaa1440p || '-'} FPS`;

    if (costThb) costThb.textContent = `~${monthlyElectricityTHB ? monthlyElectricityTHB.toLocaleString() : 0} บาท/เดือน`;
    if (kwhEl) kwhEl.textContent = `${monthlyKwh || 0} kWh/เดือน`;
    if (hoursEl) hoursEl.textContent = `${hoursPerDay || 4} ชม./วัน`;
  },

  openQuotationModal() {
    const modal = document.getElementById('quotation-modal');
    const printable = document.getElementById('quotation-printable-area');
    if (!modal || !printable) return;

    const buildName = document.getElementById('build-name')?.value.trim() || 'ชุดจัดสเปกคอมพิวเตอร์ตามสั่ง (Custom PC Build)';
    const buildDesc = document.getElementById('build-desc')?.value.trim() || 'จัดสเปกผ่านระบบอัจฉริยะ PC Builder Pro พร้อมระบบตรวจสอบความเข้ากันได้ 100%';
    const parts = Object.values(this.selectedParts);

    if (parts.length === 0) {
      Toast.warning('กรุณาเลือกชิ้นส่วนอย่างน้อย 1 ชิ้นเพื่อออกใบเสนอราคา');
      return;
    }

    let totalPrice = 0;
    let totalTdp = 0;
    const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    const itemsHtml = parts.map((part, index) => {
      totalPrice += parseFloat(part.price);
      if (part.specs && part.specs.tdp) totalTdp += part.specs.tdp;
      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 10px; text-align: center; color: #64748b;">${index + 1}</td>
          <td style="padding: 8px 10px;">
            <strong style="color: #1e293b;">${escapeHtml(part.brand)} ${escapeHtml(part.name)}</strong>
            <div style="font-size: 0.8rem; color: #64748b;">[${escapeHtml(part.category_slug)}] ${getSpecsSummary(part.specs, part.category_slug)}</div>
          </td>
          <td style="padding: 8px 10px; text-align: center;">1</td>
          <td style="padding: 8px 10px; text-align: right;">${formatPrice(part.price)}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #0f172a;">${formatPrice(part.price)}</td>
        </tr>
      `;
    }).join('');

    printable.innerHTML = `
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <div>
          <h2 style="margin: 0; color: #0f172a; font-size: 1.6rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">${ICONS.monitor} PC Builder Pro</h2>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.9rem;">ใบเสนอราคาจัดสเปกและประกอบคอมพิวเตอร์ (Official Specification Quotation)</p>
        </div>
        <div style="text-align: right; font-size: 0.85rem; color: #475569;">
          <div><strong>วันที่ออกเอกสาร:</strong> ${dateStr}</div>
          <div><strong>เลขที่อ้างอิง:</strong> PCB-${Date.now().toString().slice(-6)}</div>
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
        <h4 style="margin: 0 0 4px 0; color: #1e293b;">ชื่อชุดจัดสเปก: ${escapeHtml(buildName)}</h4>
        <p style="margin: 0; color: #64748b; font-size: 0.85rem;">${escapeHtml(buildDesc)}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-bottom: 1.5rem;">
        <thead>
          <tr style="background: #0f172a; color: white;">
            <th style="padding: 10px; text-align: center; width: 40px;">#</th>
            <th style="padding: 10px; text-align: left;">รายการอุปกรณ์ (Description)</th>
            <th style="padding: 10px; text-align: center; width: 60px;">จำนวน</th>
            <th style="padding: 10px; text-align: right; width: 110px;">ราคาต่อหน่วย</th>
            <th style="padding: 10px; text-align: right; width: 110px;">ราคารวม</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr style="background: #f1f5f9; font-weight: bold; font-size: 1rem;">
            <td colspan="4" style="padding: 12px; text-align: right;">ราคามูลค่ารวมทั้งสิ้น (Grand Total):</td>
            <td style="padding: 12px; text-align: right; color: #059669; font-size: 1.1rem;">${formatPrice(totalPrice)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; font-size: 0.85rem; color: #334155;">
        <div style="background: #f1f5f9; border-radius: 8px; padding: 0.85rem;">
          <strong style="color: #0f172a; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">${ICON_SM('zap')} สรุปกำลังไฟฟ้าและประสิทธิภาพ:</strong>
          <div>- การใช้กำลังไฟระบบโดยประมาณ: <strong>${totalTdp}W</strong></div>
          <div>- กำลัง PSU แนะนำ: <strong>อย่างน้อย ${Math.ceil(totalTdp * 1.25)}W</strong></div>
        </div>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 0.85rem;">
          <strong style="color: #0f172a; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">${ICON_SM('shield')} หมายเหตุและข้อกำหนด:</strong>
          <div>- ราคาสินค้าเป็นราคากลางอ้างอิง MSRP ณ วันที่ออกเอกสาร</div>
          <div>- สามารถพิมพ์เอกสารนี้เพื่อนำไปสั่งซื้อสินค้าจริงได้ทันที</div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 3rem; font-size: 0.85rem; color: #64748b;">
        <div style="text-align: center; width: 200px; border-top: 1px solid #cbd5e1; padding-top: 8px;">
          ผู้จัดสเปก / ผู้ออกใบเสนอราคา
        </div>
        <div style="text-align: center; width: 200px; border-top: 1px solid #cbd5e1; padding-top: 8px;">
          ลูกค้า / ผู้เห็นชอบ
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  },

  printQuotation() {
    const printable = document.getElementById('quotation-printable-area');
    if (!printable) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>PC Builder Pro - Quotation</title>
        <style>
          body { font-family: 'TH Sarabun New', sans-serif, Arial; margin: 20px; color: #0f172a; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        ${printable.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  },

  async openCrossMatchModal() {
    const modal = document.getElementById('cross-match-modal');
    const body = document.getElementById('cross-match-modal-body');
    if (!modal || !body) return;

    modal.style.display = 'flex';
    body.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p>กำลังสแกนเปรียบเทียบชิ้นส่วนมือสองในตลาด...</p></div>';

    const buildParts = Object.values(this.selectedParts).map(p => ({
      part_id: p.id,
      quantity: 1,
    }));

    if (buildParts.length === 0) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${ICONS.package}</div>
          <h3>ยังไม่ได้เลือกอะไหล่ในชุดจัดสเปก</h3>
          <p>กรุณาเลือกชิ้นส่วนในหน้า Builder อย่างน้อย 1 ชิ้นเพื่อเปรียบเทียบราคามือสอง</p>
        </div>
      `;
      return;
    }

    try {
      const data = await API.post('/builds/cross-match', { parts: buildParts });
      
      let html = `
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="font-size: 0.85rem; color: #94a3b8; text-transform: uppercase;">ราคามือหนึ่งรวม / ราคามือสองในตลาด</div>
            <div style="font-size: 1.4rem; font-weight: 700; color: #f8fafc;">
              ${formatPrice(data.totalNewPrice)} <span style="display: inline-flex; vertical-align: middle; color: #94a3b8;">${ICON_SM('arrowRight')}</span> <span style="color: #34d399;">${formatPrice(data.totalSecondHandPrice)}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.85rem; color: #94a3b8;">ประหยัดงบได้สูงสุด</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: #f59e0b;">
              ฿${data.potentialSavings.toLocaleString()} (${data.savingsPercentage}%)
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 1rem;">
      `;

      html += data.matches.map(m => {
        return `
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <div>
                <span style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">[${escapeHtml(m.category_name)}]</span>
                <strong style="font-size: 0.95rem; color: #f1f5f9; display: block;">${escapeHtml(m.brand || '')} ${escapeHtml(m.model || m.part_name)}</strong>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 0.8rem; color: #94a3b8;">มือหนึ่ง: ${formatPrice(m.new_price)}</span>
                ${m.has_secondhand ? `<div style="color: #34d399; font-size: 0.85rem; font-weight: 700;">มือสองเริ่ม ${formatPrice(m.lowest_secondhand_price)}</div>` : '<div style="color: #64748b; font-size: 0.8rem;">ไม่มีประกาศมือสอง</div>'}
              </div>
            </div>

            ${m.has_secondhand ? `
              <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 0.6rem; display: flex; flex-direction: column; gap: 6px; margin-top: 0.5rem;">
                ${m.available_listings.map(l => `
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem;">
                    <span style="color: #cbd5e1;">ผู้ขาย: ${escapeHtml(l.seller_name)} | สภาพ ${escapeHtml(l.condition)} | ประกัน ${l.remaining_warranty_months || 0} ด.</span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <span style="font-weight: 700; color: #34d399;">${formatPrice(l.price)}</span>
                      <a href="/product-detail.html?id=${l.id}" target="_blank" class="btn btn-outline btn-sm" style="padding: 2px 8px; font-size: 0.75rem; text-decoration: none;">ดูสินค้า</a>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      html += '</div>';
      body.innerHTML = html;
    } catch (e) {
      body.innerHTML = `<div class="empty-state"><h3>เกิดข้อผิดพลาดในการดึงข้อมูล</h3><p>${escapeHtml(e.message)}</p></div>`;
    }
  },

  renderCompatibility() {
    const container = document.getElementById('compat-panel');
    if (!container) return;

    const { compatible, warnings, errors } = this.compatibility;

    if (errors.length === 0 && warnings.length === 0) {
      container.innerHTML = `
        <h4 class="compat-ok-title">${ICON_SM('check')} เข้ากันได้</h4>
        <p class="text-muted" style="font-size: 0.85rem;">อะไหล่ที่เลือกทั้งหมดเข้ากันได้</p>
      `;
      return;
    }

    let html = '';

    if (errors.length > 0) {
      html += `<h4 class="compat-error-title">${ICON_SM('x')} ปัญหาความเข้ากันได้</h4>`;
      errors.forEach(err => {
        html += `<div class="compat-item error">${ICON_SM('x')} ${escapeHtml(err)}</div>`;
      });
    }

    if (warnings.length > 0) {
      html += `<h4 class="compat-warn-title mt-1">${ICON_SM('alertTriangle')} คำเตือน</h4>`;
      warnings.forEach(warn => {
        html += `<div class="compat-item warning">${ICON_SM('alertTriangle')} ${escapeHtml(warn)}</div>`;
      });
    }

    container.innerHTML = html;
  },

  getPartCompatibilityStatus(part) {
    // แสดงสถานะความเข้ากันได้ของอะไหล่แต่ละชิ้น
    const { errors, warnings } = this.compatibility;
    const partName = part.name;

    for (const err of errors) {
      if (err.includes(partName) || err.toLowerCase().includes(part.category_slug)) {
        return { class: 'error', html: `${ICON_SM('x')} เข้ากันไม่ได้` };
      }
    }

    for (const warn of warnings) {
      if (warn.includes(partName) || warn.toLowerCase().includes(part.category_slug)) {
        return { class: 'warn', html: `${ICON_SM('alertTriangle')} คำเตือน` };
      }
    }

    return { class: '', html: '' };
  },

  updateBrandFilter() {
    const select = document.getElementById('brand-filter');
    if (!select) return;

    const currentVal = select.value;
    const brands = [...new Set(
      this.parts
        .filter(p => p.category_slug === this.currentCategory)
        .map(p => p.brand)
    )].sort();

    select.innerHTML = '<option value="">ทุกยี่ห้อ</option>' +
      brands.map(b => `<option value="${escapeHtml(b)}" ${b === currentVal ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('');
  },

  getCategoryIcon(slug) {
    const icons = {
      'cpu': ICONS.cpu,
      'cpu-cooler': ICONS.fan,
      'motherboard': ICONS.motherboard,
      'ram': ICONS.ram,
      'gpu': ICONS.gpu,
      'storage': ICONS.storage,
      'psu': ICONS.zap,
      'case': ICONS.package,
    };
    return icons[slug] || ICONS.wrench;
  },

  async saveBuild() {
    if (!Auth.isLoggedIn()) {
      Toast.warning('กรุณาเข้าสู่ระบบก่อนบันทึกชุดประกอบ');
      window.location.href = '/login.html';
      return;
    }

    const name = document.getElementById('build-name')?.value.trim();
    if (!name) {
      Toast.warning('กรุณาใส่ชื่อชุดประกอบ');
      document.getElementById('build-name')?.focus();
      return;
    }

    const buildParts = Object.values(this.selectedParts).map(p => ({
      part_id: p.id,
      quantity: 1,
    }));

    if (buildParts.length === 0) {
      Toast.warning('เพิ่มอะไหล่อย่างน้อยหนึ่งชิ้น');
      return;
    }

    try {
      const result = await API.post('/builds', {
        name,
        description: document.getElementById('build-desc')?.value.trim() || '',
        is_public: true,
        parts: buildParts,
      });

      Toast.success('บันทึกชุดประกอบสำเร็จ!');
      window.location.href = `/build-detail.html?id=${result.build.id}`;
    } catch (error) {
      Toast.error('บันทึกไม่สำเร็จ: ' + error.message);
    }
  },

  async loadBuild(buildId) {
    try {
      const build = await API.get(`/builds/${buildId}`);
      this.selectedParts = {};

      for (const bp of build.parts) {
        const fullPart = this.parts.find(p => p.id === bp.part_id);
        if (fullPart) {
          this.selectedParts[bp.category_slug] = fullPart;
        }
      }

      // ตั้งชื่อชุดประกอบ
      const nameInput = document.getElementById('build-name');
      if (nameInput) nameInput.value = build.name + ' (สำเนา)';

      this.renderCategories();
      this.renderSummary();
      this.checkCompatibility();
      Toast.success('โหลดชุดประกอบเข้าแล้ว');
    } catch (error) {
      Toast.error('โหลดชุดประกอบไม่สำเร็จ: ' + error.message);
    }
  },

  shareBuild() {
    const buildParts = Object.values(this.selectedParts).map(p => p.id).join(',');
    const url = `${window.location.origin}/builder.html?parts=${buildParts}`;
    navigator.clipboard.writeText(url).then(() => {
      Toast.success('คัดลอกลิงก์ชุดประกอบแล้ว!');
    }).catch(() => {
      Toast.info('คัดลอกลิงก์นี้: ' + url);
    });
  },

  clearBuild() {
    if (!confirm('ล้างอะไหล่ที่เลือกทั้งหมด?')) return;
    this.selectedParts = {};
    const nameInput = document.getElementById('build-name');
    if (nameInput) nameInput.value = '';
    this.renderCategories();
    this.renderPartsList();
    this.renderSummary();
    this.checkCompatibility();
  },

  marketplaceAvailability: {},

  async checkMarketplaceAvailability() {
    const panel = document.getElementById('marketplace-checkout-panel');
    const statusContainer = document.getElementById('marketplace-parts-status');
    const cartAddAllBtn = document.getElementById('cart-add-all-btn');
    if (!panel || !statusContainer) return;

    const parts = Object.values(this.selectedParts);
    if (parts.length === 0) {
      panel.style.display = 'none';
      return;
    }

    panel.style.display = 'block';
    statusContainer.innerHTML = '<div style="text-align: center; padding: 0.5rem; color: var(--text-muted);">กำลังตรวจสอบสินค้ามือสอง...</div>';

    try {
      const partIds = parts.map(p => p.id);
      const availability = await API.post('/products/availability', { partIds });
      this.marketplaceAvailability = availability;

      const availableParts = [];
      const missingParts = [];

      parts.forEach(part => {
        const avail = availability[part.id];
        if (avail && avail.available) {
          availableParts.push({ part, avail });
        } else {
          missingParts.push(part);
        }
      });

      let html = '';

      // 1. ชิ้นส่วนที่มีพร้อมขายในระบบ
      if (availableParts.length > 0) {
        html += `
          <div style="margin-bottom: 0.85rem;">
            <div style="font-weight: bold; color: var(--success); font-size: 0.85rem; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 4px;">
              ${ICON_SM('package')} สินค้าพร้อมสั่งซื้อในระบบ (${availableParts.length})
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; background: rgba(0, 200, 80, 0.03); border: 1px solid rgba(0, 200, 80, 0.1); border-radius: var(--radius); padding: 0.5rem;">
              ${availableParts.map(({ part, avail }) => {
                const icon = this.getCategoryIcon(part.category_slug);
                return `
                  <div style="font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; padding: 2px 0;">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;" title="${escapeHtml(part.brand)} ${escapeHtml(part.name)}">
                      ${icon} ${escapeHtml(part.brand)} ${escapeHtml(part.name)}
                    </span>
                    <span style="color: var(--success); font-weight: bold;">฿${formatPrice(avail.price)}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
        if (cartAddAllBtn) cartAddAllBtn.style.display = 'block';
      } else {
        if (cartAddAllBtn) cartAddAllBtn.style.display = 'none';
      }

      // 2. ชิ้นส่วนที่ขาดในระบบ (แนะนำซื้อจากแหล่งอื่นรายชิ้น)
      if (missingParts.length > 0) {
        html += `
          <div>
            <div style="font-weight: bold; color: var(--danger); font-size: 0.85rem; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 4px;">
              ${ICON_SM('alertTriangle')} สินค้าขาดในเว็บ (แนะนำซื้อภายนอก)
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${missingParts.map(part => {
                const icon = this.getCategoryIcon(part.category_slug);
                const query = encodeURIComponent(`${part.brand} ${part.name}`);
                const shopeeUrl = `https://shopee.co.th/search?keyword=${query}&utm_source=pcbuilderpro`;
                const lazadaUrl = `https://www.lazada.co.th/catalog/?q=${query}&utm_source=pcbuilderpro`;
                return `
                  <div style="font-size: 0.8rem; background: rgba(255, 75, 75, 0.02); border: 1px solid rgba(255, 75, 75, 0.1); border-radius: var(--radius); padding: 0.5rem;">
                    <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px; font-weight: 500;" title="${escapeHtml(part.brand)} ${escapeHtml(part.name)}">
                      ${icon} ${escapeHtml(part.brand)} ${escapeHtml(part.name)}
                    </div>
                    <div style="display: flex; gap: 6px;">
                      <a href="${shopeeUrl}" target="_blank" style="flex: 1; padding: 4px 6px; font-size: 0.72rem; text-align: center; border: 1px solid #ff5722; color: #ff5722; background: none; border-radius: var(--radius); cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-weight: bold; transition: all 0.2s;">
                        ${ICON_SM('shoppingCart')} Shopee
                      </a>
                      <a href="${lazadaUrl}" target="_blank" style="flex: 1; padding: 4px 6px; font-size: 0.72rem; text-align: center; border: 1px solid #3549ff; color: #3549ff; background: none; border-radius: var(--radius); cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-weight: bold; transition: all 0.2s;">
                        ${ICON_SM('shoppingCart')} Lazada
                      </a>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }

      statusContainer.innerHTML = html;

    } catch (error) {
      statusContainer.innerHTML = `<div style="color: var(--danger); font-size: 0.8rem;">ไม่สามารถตรวจสอบราคามือสองได้: ${error.message}</div>`;
    }
  },

  addAllAvailableToCart() {
    const parts = Object.values(this.selectedParts);
    let addedCount = 0;
    let missingCount = 0;

    parts.forEach(part => {
      const avail = this.marketplaceAvailability[part.id];
      if (avail && avail.available) {
        Cart.addItem({
          product_id: avail.product_id,
          part_id: part.id,
          name: part.name,
          price: avail.price,
          brand: part.brand,
          model: part.model,
          condition: avail.condition,
          seller_name: avail.seller_name
        });
        addedCount++;
      } else {
        missingCount++;
      }
    });

    if (addedCount > 0) {
      Auth.updateUI();
      if (missingCount > 0) {
        Toast.warning(`เพิ่มสินค้ามือสองที่มี ${addedCount} รายการลงตะกร้าแล้ว (สินค้าขาด ${missingCount} รายการ แนะนำให้คลิกค้นหาภายนอกรายชิ้น)`);
      } else {
        Toast.success('เพิ่มสินค้ามือสองครบถ้วนลงตะกร้าแล้ว!');
      }
    } else {
      Toast.error('ไม่มีชิ้นส่วนที่พร้อมจำหน่ายในระบบมือสองเลย แนะนำสั่งซื้อภายนอกแทน');
    }
  },

  openExternalAffiliateLinks() {
    // ฟังก์ชันนี้เก็บไว้เป็น fallback แต่หน้าเว็บใช้เป็นรายชิ้นแทน
    const parts = Object.values(this.selectedParts);
    parts.forEach(part => {
      const avail = this.marketplaceAvailability[part.id];
      if (!avail || !avail.available) {
        const query = encodeURIComponent(`${part.brand} ${part.name}`);
        const shopeeUrl = `https://shopee.co.th/search?keyword=${query}&utm_source=pcbuilderpro`;
        window.open(shopeeUrl, '_blank');
      }
    });
  },

  async runAutoBuild() {
    const budgetInput = document.getElementById('auto-budget');
    const budget = parseFloat(budgetInput?.value);
    const useCase = document.getElementById('auto-usecase')?.value;

    if (isNaN(budget) || budget < 12000) {
      Toast.warning('กรุณาระบุงบประมาณขั้นต่ำอย่างน้อย 12,000 บาท');
      budgetInput?.focus();
      return;
    }

    const container = document.getElementById('auto-results-container');
    const grid = document.getElementById('auto-options-grid');
    if (!container || !grid) return;

    container.style.display = 'block';
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem 0;"><div class="spinner"></div><p style="margin-top: 1rem;">ระบบกำลังประมวลผล เปรียบเทียบ 3 ตัวเลือกที่ดีที่สุด...</p></div>';

    try {
      const response = await API.post('/builds/auto', { budget, useCase });
      const options = response.options;

      if (!options || options.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem 0;">ไม่พบชุดประกอบที่เหมาะสมกับงบประมาณนี้</div>';
        return;
      }

      grid.innerHTML = options.map((opt, idx) => {
        const hasBottleneck = opt.bottleneck.type !== 'none';
        const bottleneckColor = opt.bottleneck.percentage > 20 ? 'var(--danger)' : 'var(--warning)';

        return `
          <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; height: 100%; box-shadow: var(--shadow);">
            <div>
              <div style="background: ${idx === 1 ? 'var(--highlight)' : 'var(--accent)'}; color: white; display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; margin-bottom: 0.75rem;">
                ${opt.label}
              </div>
              <h4 style="font-size: 1.4rem; margin-bottom: 0.25rem; color: var(--success);">฿${formatPrice(opt.price)}</h4>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.4;">${opt.description}</p>
              
              <div style="border-bottom: 1px solid var(--border); border-top: 1px solid var(--border); padding: 0.75rem 0; margin-bottom: 0.75rem;">
                <div style="font-size: 0.85rem; display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: var(--text-muted);">คะแนนประสิทธิภาพรวม</span>
                  <span style="font-weight: bold; color: var(--success);">${opt.performanceScore.toLocaleString()}</span>
                </div>
                <div style="font-size: 0.85rem; display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">คอขวด CPU-GPU</span>
                  <span style="font-weight: bold; color: ${hasBottleneck ? bottleneckColor : 'var(--success)'};">
                    ${hasBottleneck ? `${opt.bottleneck.percentage}% (${opt.bottleneck.type === 'cpu' ? 'ขวดที่ CPU' : 'ขวดที่ GPU'})` : 'สมดุลดีเยี่ยม'}
                  </span>
                </div>
                ${hasBottleneck ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px; border-left: 2px solid ${bottleneckColor}; padding-left: 6px;">${opt.bottleneck.message} · ${opt.bottleneck.solution}</div>` : ''}
              </div>

              <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 1.5rem;">
                ${opt.parts.map(p => {
                  const icon = this.getCategoryIcon(p.category_slug);
                  const isAvailable = p.available;
                  return `
                    <div style="font-size: 0.82rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.03); padding-bottom: 3px;">
                      <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 75%;" title="${escapeHtml(p.brand)} ${escapeHtml(p.name)}">
                        ${icon} <strong>${escapeHtml(p.brand)}</strong> ${escapeHtml(p.name)}
                      </span>
                      <span style="color: ${isAvailable ? 'var(--success)' : 'var(--text-muted)'}; font-size: 0.78rem;">
                        ${isAvailable ? `฿${formatPrice(p.actual_price)}` : `${ICON_SM('alertTriangle')} สินค้าขาด`}
                      </span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <button class="btn btn-primary auto-select-build-btn" data-index="${idx}" style="width: 100%; border-radius: var(--radius); padding: 0.6rem; font-size: 0.9rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
              ${ICON_SM('check')} เลือกชุดนี้ไปใช้งานต่อ
            </button>
          </div>
        `;
      }).join('');

      grid.querySelectorAll('.auto-select-build-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(btn.dataset.index);
          this.loadAutoBuildIntoWorkspace(options[index]);
        });
      });

    } catch (error) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--danger); padding: 3rem 0;">เกิดข้อผิดพลาด: ${error.message}</div>`;
    }
  },

  loadAutoBuildIntoWorkspace(build) {
    this.selectedParts = {};
    build.parts.forEach(p => {
      this.selectedParts[p.category_slug] = p;
    });

    const nameInput = document.getElementById('build-name');
    if (nameInput) nameInput.value = `${build.label} (${formatPrice(build.price)})`;
    const descInput = document.getElementById('build-desc');
    if (descInput) {
      const ucSelect = document.getElementById('auto-usecase');
      const ucText = ucSelect?.options[ucSelect.selectedIndex]?.text || '';
      descInput.value = `ชุดสเปคจัดอัจฉริยะ งบประมาณ ${formatPrice(build.price)} สำหรับการใช้งาน: ${ucText}`;
    }

    this.renderCategories();
    this.renderSummary();
    this.checkCompatibility();
    this.switchTab('manual');
    Toast.success(`โหลดชุด "${build.label}" สำเร็จ และสลับกลับไปที่โหมดแก้ไขแล้ว!`);
  },

  switchTab(tab) {
    const manualBtn = document.getElementById('mode-manual-btn');
    const autoBtn = document.getElementById('mode-auto-btn');
    const manualLayout = document.getElementById('manual-builder-layout');
    const autoLayout = document.getElementById('auto-builder-layout');
    if (!manualBtn || !autoBtn || !manualLayout || !autoLayout) return;

    if (tab === 'manual') {
      manualLayout.style.display = 'grid';
      autoLayout.style.display = 'none';

      manualBtn.style.background = 'var(--accent)';
      manualBtn.style.color = 'white';
      manualBtn.className = 'btn tab-btn active';

      autoBtn.style.background = 'transparent';
      autoBtn.style.color = 'var(--text-secondary)';
      autoBtn.className = 'btn tab-btn btn-ghost';
    } else {
      manualLayout.style.display = 'none';
      autoLayout.style.display = 'grid';

      autoBtn.style.background = 'var(--accent)';
      autoBtn.style.color = 'white';
      autoBtn.className = 'btn tab-btn active';

      manualBtn.style.background = 'transparent';
      manualBtn.style.color = 'var(--text-secondary)';
      manualBtn.className = 'btn tab-btn btn-ghost';
    }
  }
};

// === เริ่มต้นเมื่อโหลดหน้าเว็บเสร็จ ===
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('category-list')) {
    Builder.init();

    // ช่องค้นหา
    document.getElementById('parts-search')?.addEventListener('input', () => {
      Builder.renderPartsList();
    });

    // ตัวกรองยี่ห้อ
    document.getElementById('brand-filter')?.addEventListener('change', () => {
      Builder.renderPartsList();
    });

    // ตัวกรองเรียงลำดับ
    document.getElementById('sort-filter')?.addEventListener('change', () => {
      Builder.renderPartsList();
    });

    // ปุ่มบันทึกชุดประกอบ
    document.getElementById('save-build-btn')?.addEventListener('click', () => {
      Builder.saveBuild();
    });

    // ปุ่มแชร์
    document.getElementById('share-build-btn')?.addEventListener('click', () => {
      Builder.shareBuild();
    });

    // ปุ่มล้างทั้งหมด
    document.getElementById('clear-build-btn')?.addEventListener('click', () => {
      Builder.clearBuild();
    });

    // === ผูกปุ่มโหมดและตะกร้าใหม่ ===
    document.getElementById('mode-manual-btn')?.addEventListener('click', () => {
      Builder.switchTab('manual');
    });

    document.getElementById('mode-auto-btn')?.addEventListener('click', () => {
      Builder.switchTab('auto');
    });

    document.getElementById('auto-submit-btn')?.addEventListener('click', () => {
      Builder.runAutoBuild();
    });

    document.getElementById('cart-add-all-btn')?.addEventListener('click', () => {
      Builder.addAllAvailableToCart();
    });

    document.getElementById('export-pdf-btn')?.addEventListener('click', () => {
      Builder.openQuotationModal();
    });

    document.getElementById('print-quotation-action-btn')?.addEventListener('click', () => {
      Builder.printQuotation();
    });

    document.getElementById('close-quotation-modal')?.addEventListener('click', () => {
      const modal = document.getElementById('quotation-modal');
      if (modal) modal.style.display = 'none';
    });

    document.getElementById('power-hours-slider')?.addEventListener('input', () => {
      Builder.updateIntelligence();
    });

    document.getElementById('cross-match-btn')?.addEventListener('click', () => {
      Builder.openCrossMatchModal();
    });

    document.getElementById('close-cross-match-modal')?.addEventListener('click', () => {
      const modal = document.getElementById('cross-match-modal');
      if (modal) modal.style.display = 'none';
    });
  }
});
