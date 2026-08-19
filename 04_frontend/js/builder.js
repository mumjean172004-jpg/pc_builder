/**
 * Second-hand Computer Marketplace System — ตรรกะของหน้าประกอบ PC
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

// Splits getSpecsSummary()'s single "10C/16T · LGA1700 · 65W"-style string into
// individual pill chips (reuses products.html's .spec-chip class, no new CSS).
function specsToChips(specs, categorySlug) {
  const summary = getSpecsSummary(specs, categorySlug);
  if (!summary) return '';
  return summary.split(' · ').map(seg => `<span class="spec-chip">${escapeHtml(seg)}</span>`).join('');
}

function conditionLabel(value) {
  return {
    new: 'New',
    used_90: 'Used 90%',
    used_80: 'Used 80%',
    used_70: 'Used 70%',
  }[value] || value;
}

// Category-specific filter sets for the Builder part picker. Each filter's option
// list is derived from what's actually in `this.parts` for that category (only
// values with real live listings show up — not the full master lookup), same
// idea as the brand filter already had before this was generalized.
const CATEGORY_FILTERS = {
  cpu: [
    { key: 'brand', label: 'ยี่ห้อ', get: (p) => p.brand },
    { key: 'socket', label: 'Socket', get: (p) => p.specs?.socket },
    { key: 'generation', label: 'เจเนอเรชัน', get: (p) => p.specs?.generation },
    { key: 'series', label: 'ซีรีส์', get: (p) => p.specs?.series },
  ],
  motherboard: [
    { key: 'socket', label: 'Socket', get: (p) => p.specs?.socket },
    { key: 'chipset', label: 'Chipset', get: (p) => p.specs?.chipset },
    { key: 'generation', label: 'Gen ที่รองรับ', get: (p) => p.specs?.generation },
    { key: 'form_factor', label: 'ขนาดบอร์ด (Form Factor)', get: (p) => p.specs?.form_factor },
    { key: 'ram_type', label: 'ชนิด RAM', get: (p) => p.specs?.ram_type },
    { key: 'brand', label: 'ยี่ห้อ', get: (p) => p.brand },
  ],
  ram: [
    { key: 'type', label: 'ประเภท', get: (p) => p.specs?.type },
    { key: 'speed', label: 'บัส (Bus)', get: (p) => p.specs?.speed },
    { key: 'capacity_gb', label: 'ความจุ (GB)', get: (p) => p.specs?.capacity_gb },
    { key: 'brand', label: 'ยี่ห้อ', get: (p) => p.brand },
  ],
  gpu: [
    { key: 'chip', label: 'ชิปเซ็ต', get: (p) => p.specs?.chip },
    { key: 'series', label: 'ซีรีส์', get: (p) => p.specs?.series },
    { key: 'brand', label: 'ยี่ห้อ', get: (p) => p.brand },
  ],
  psu: [
    { key: 'brand', label: 'ยี่ห้อ', get: (p) => p.brand },
    { key: 'modularity', label: 'ประเภทสาย', get: (p) => p.specs?.modularity },
    { key: 'efficiency', label: 'มาตรฐาน 80 Plus', get: (p) => p.specs?.efficiency },
  ],
  storage: [
    { key: 'brand', label: 'ยี่ห้อ', get: (p) => p.brand },
    { key: 'interface', label: 'อินเทอร์เฟส', get: (p) => p.specs?.interface },
    { key: 'capacity_gb', label: 'ความจุ (GB)', get: (p) => p.specs?.capacity_gb },
  ],
};

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

      // โหลดอะไหล่ที่มีคนลงขายอยู่จริง (ไม่ใช่แคตตาล็อกกลาง)
      this.parts = await API.get('/builds/available-parts');

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
    this.renderCategoryFilters();
    this.renderPartsList();
  },

  // Builds the category-specific filter dropdown row (Brand/Socket/Series, etc. —
  // see CATEGORY_FILTERS). Rebuilt once per category switch, not on every
  // keystroke/filter change, so an in-progress selection never gets clobbered.
  renderCategoryFilters() {
    const card = document.getElementById('category-filters-card');
    const grid = document.getElementById('category-filters-grid');
    if (!card || !grid) return;

    const fields = CATEGORY_FILTERS[this.currentCategory];
    if (!fields) {
      card.style.display = 'none';
      grid.innerHTML = '';
      return;
    }

    const partsInCategory = this.parts.filter(p => p.category_slug === this.currentCategory);

    grid.innerHTML = fields.map(f => {
      const values = [...new Set(
        partsInCategory.map(f.get).filter(v => v !== undefined && v !== null && v !== '')
      )].sort((a, b) => String(a).localeCompare(String(b), 'th', { numeric: true }));

      return `
        <div class="category-filter-group">
          <label for="cat-filter-${f.key}">${escapeHtml(f.label)}</label>
          <select class="filter-select" id="cat-filter-${f.key}" data-filter-key="${f.key}">
            <option value="">ทั้งหมด</option>
            ${values.map(v => `<option value="${escapeHtml(String(v))}">${escapeHtml(String(v))}</option>`).join('')}
          </select>
        </div>
      `;
    }).join('');

    card.style.display = 'block';

    grid.querySelectorAll('select').forEach(sel => {
      sel.addEventListener('change', () => this.renderPartsList());
    });
  },

  resetCategoryFilters() {
    const grid = document.getElementById('category-filters-grid');
    if (grid) grid.querySelectorAll('select').forEach(sel => { sel.value = ''; });
    const searchInput = document.getElementById('parts-search');
    if (searchInput) searchInput.value = '';
    const sortFilter = document.getElementById('sort-filter');
    if (sortFilter) sortFilter.value = 'name';
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

    // กรองตามตัวกรองเฉพาะหมวดหมู่ (ยี่ห้อ/Socket/ซีรีส์/ฯลฯ — ดู CATEGORY_FILTERS)
    const activeFilterFields = CATEGORY_FILTERS[this.currentCategory] || [];
    activeFilterFields.forEach(f => {
      const el = document.getElementById(`cat-filter-${f.key}`);
      if (el && el.value) {
        filtered = filtered.filter(p => String(f.get(p) ?? '') === el.value);
      }
    });

    // ล็อคความเข้ากันได้: ซ่อนอะไหล่ที่ Socket/ชนิด RAM ไม่ตรงกับสิ่งที่เลือกไว้แล้วในหมวดอื่น
    // (CPU↔เมนบอร์ด ผ่าน socket, RAM↔เมนบอร์ด ผ่าน ram_type) — กรองแบบกำหนดตายตัวจาก specs
    // โดยตรง ไม่ใช่การจับคู่ข้อความแบบ getPartCompatibilityStatus()
    let lockMessage = null;
    if (this.currentCategory === 'motherboard') {
      const cpu = this.selectedParts.cpu;
      const ram = this.selectedParts.ram;
      if (cpu?.specs?.socket) {
        filtered = filtered.filter(p => p.specs?.socket === cpu.specs.socket);
        lockMessage = `ไม่มีเมนบอร์ดที่รองรับ Socket ${escapeHtml(cpu.specs.socket)} ของ CPU ที่เลือกไว้ (ลองเอา CPU ออกก่อน)`;
      }
      if (ram?.specs?.type) {
        filtered = filtered.filter(p => p.specs?.ram_type === ram.specs.type);
        lockMessage = `ไม่มีเมนบอร์ดที่รองรับ RAM ชนิด ${escapeHtml(ram.specs.type)} ที่เลือกไว้ (ลองเอา RAM ออกก่อน)`;
      }
    } else if (this.currentCategory === 'cpu') {
      const motherboard = this.selectedParts.motherboard;
      if (motherboard?.specs?.socket) {
        filtered = filtered.filter(p => p.specs?.socket === motherboard.specs.socket);
        lockMessage = `ไม่มี CPU ที่รองรับ Socket ${escapeHtml(motherboard.specs.socket)} ของเมนบอร์ดที่เลือกไว้ (ลองเอาเมนบอร์ดออกก่อน)`;
      }
    } else if (this.currentCategory === 'ram') {
      const motherboard = this.selectedParts.motherboard;
      if (motherboard?.specs?.ram_type) {
        filtered = filtered.filter(p => p.specs?.type === motherboard.specs.ram_type);
        lockMessage = `ไม่มี RAM ชนิด ${escapeHtml(motherboard.specs.ram_type)} ที่รองรับเมนบอร์ดที่เลือกไว้ (ลองเอาเมนบอร์ดออกก่อน)`;
      }
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
          <p>${lockMessage || 'ไม่พบอะไหล่'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(part => {
      const isSelected = this.selectedParts[part.category_slug]?.id === part.id;
      const compatStatus = this.getPartCompatibilityStatus(part);
      const photoUrl = part.photos && part.photos[0];
      const iconHtml = photoUrl
        ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(part.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius);">`
        : this.getCategoryIcon(part.category_slug);

      return `
        <div class="part-item ${isSelected ? 'selected' : ''} ${compatStatus.class === 'error' ? 'incompatible' : ''}"
             data-id="${part.id}" data-category="${part.category_slug}">
          <div class="part-item-icon">${iconHtml}</div>
          <div class="part-item-info">
            <div class="part-item-name">${escapeHtml(part.name)}</div>
            <div class="part-item-specs">${specsToChips(part.specs, part.category_slug)}</div>
            <div class="text-muted" style="font-size: 0.72rem; margin-top: 2px;">ร้าน ${escapeHtml(part.seller_name)} · ${conditionLabel(part.condition)}</div>
          </div>
          <div class="part-item-right">
            <div class="part-item-price">${formatPrice(part.price)}</div>
            <div class="part-item-brand">${escapeHtml(part.brand)}</div>
            ${compatStatus.html ? `<div class="part-item-compat ${compatStatus.class}">${compatStatus.html}</div>` : ''}
            <button class="btn btn-primary btn-sm select-part-btn" data-id="${part.id}" data-category="${part.category_slug}" style="margin-top: 6px;">+ เลือก</button>
          </div>
        </div>
      `;
    }).join('');

    const pickPart = (item) => {
      const partId = parseInt(item.dataset.id);
      const categorySlug = item.dataset.category;
      const part = this.parts.find(p => p.id === partId);
      if (part) {
        this.selectPart(categorySlug, part);
      }
    };

    container.querySelectorAll('.part-item').forEach(item => {
      item.addEventListener('click', () => pickPart(item));
    });
    container.querySelectorAll('.select-part-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        pickPart(btn);
      });
    });

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

    container.innerHTML = slugs.map(slug => {
      const part = this.selectedParts[slug];
      total += parseFloat(part.price);
      const isUnavailable = part.available === false;

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
          <div style="display: flex; justify-content: space-between; align-items: center; padding-left: 28px;">
            ${isUnavailable
              ? `<span class="text-danger" style="font-size: 0.75rem;">${ICON_SM('alertTriangle')} ไม่พร้อมขายแล้ว (สินค้าอาจถูกขายหรือถอดออก)</span>`
              : `<span class="text-muted" style="font-size: 0.75rem;">ร้าน ${escapeHtml(part.seller_name || '')} · ${conditionLabel(part.condition)}</span>`
            }
            <div class="flex gap-1">
              <a href="/product-detail.html?id=${part.id}" target="_blank" class="btn btn-outline btn-sm" style="font-size: 0.7rem; padding: 2px 8px;">ดูสินค้า</a>
              <a href="https://shopee.co.th/search?keyword=${encodeURIComponent(`${part.brand} ${part.model}`)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="font-size: 0.7rem; padding: 2px 8px;">ดูใน Shopee</a>
            </div>
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
    this.renderCartPanel();
  },

  updateTotalPrice(total) {
    const el = document.getElementById('summary-total-price');
    if (el) el.textContent = formatPrice(total);
  },

  async checkCompatibility() {
    const buildParts = Object.values(this.selectedParts).map(p => ({
      product_id: p.id,
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
  },

  openQuotationModal() {
    const modal = document.getElementById('quotation-modal');
    const printable = document.getElementById('quotation-printable-area');
    if (!modal || !printable) return;

    const buildName = document.getElementById('build-name')?.value.trim() || 'ชุดจัดสเปกคอมพิวเตอร์ตามสั่ง (Custom PC Build)';
    const buildDesc = document.getElementById('build-desc')?.value.trim() || 'จัดสเปกผ่านระบบอัจฉริยะ Second-hand Computer Marketplace System พร้อมระบบตรวจสอบความเข้ากันได้ 100%';
    const parts = Object.values(this.selectedParts);

    if (parts.length === 0) {
      Toast.warning('กรุณาเลือกชิ้นส่วนอย่างน้อย 1 ชิ้นเพื่อออกใบเสนอราคา');
      return;
    }

    let totalPrice = 0;
    const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    const itemsHtml = parts.map((part, index) => {
      totalPrice += parseFloat(part.price);
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
          <h2 style="margin: 0; color: #0f172a; font-size: 1.6rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">${ICONS.monitor} Second-hand Computer Marketplace System</h2>
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

      <div style="display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 2rem; font-size: 0.85rem; color: #334155;">
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
        <title>Second-hand Computer Marketplace System - Quotation</title>
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
      product_id: p.id,
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

  getCategoryIcon(slug) {
    const icons = {
      'cpu': ICONS.cpu,
      'motherboard': ICONS.motherboard,
      'ram': ICONS.ram,
      'gpu': ICONS.gpu,
      'storage': ICONS.storage,
      'psu': ICONS.zap,
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
      product_id: p.id,
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
      window.location.href = '/profile.html';
    } catch (error) {
      Toast.error('บันทึกไม่สำเร็จ: ' + error.message);
    }
  },

  async loadBuild(buildId) {
    try {
      const build = await API.get(`/builds/${buildId}`);
      this.selectedParts = {};

      // Server already tells us whether each saved listing is still active/approved
      // (`available`) — a build saved a while ago may reference a listing that's
      // since sold or been paused; show it as unavailable instead of silently
      // dropping it so the user knows before re-saving.
      for (const bp of build.parts) {
        if (!bp.category_slug) continue;
        this.selectedParts[bp.category_slug] = {
          id: bp.product_id,
          name: bp.name,
          brand: bp.brand,
          model: bp.model,
          price: bp.price,
          specs: bp.specs,
          category_slug: bp.category_slug,
          category_name: bp.category_name,
          available: bp.available,
        };
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

  // Every selected part is already a real listing (Builder now picks directly from
  // `products`), so there's no separate "check marketplace availability" step
  // needed anymore — this panel just summarizes what's about to go in the cart.
  renderCartPanel() {
    const panel = document.getElementById('marketplace-checkout-panel');
    const statusContainer = document.getElementById('marketplace-parts-status');
    const cartAddAllBtn = document.getElementById('cart-add-all-btn');
    if (!panel || !statusContainer) return;

    const parts = Object.values(this.selectedParts).filter(p => p.available !== false);
    if (parts.length === 0) {
      panel.style.display = 'none';
      return;
    }

    panel.style.display = 'block';
    if (cartAddAllBtn) cartAddAllBtn.style.display = 'block';

    statusContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 4px; background: rgba(0, 200, 80, 0.03); border: 1px solid rgba(0, 200, 80, 0.1); border-radius: var(--radius); padding: 0.5rem;">
        ${parts.map(part => `
          <div style="font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; padding: 2px 0;">
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;" title="${escapeHtml(part.brand)} ${escapeHtml(part.name)}">
              ${this.getCategoryIcon(part.category_slug)} ${escapeHtml(part.brand)} ${escapeHtml(part.name)}
            </span>
            <span style="color: var(--success); font-weight: bold;">฿${formatPrice(part.price)}</span>
          </div>
        `).join('')}
      </div>
    `;
  },

  addAllToCart() {
    const parts = Object.values(this.selectedParts).filter(p => p.available !== false);
    parts.forEach(part => {
      Cart.addItem({
        product_id: part.id,
        name: part.name,
        price: part.price,
        brand: part.brand,
        model: part.model,
        condition: part.condition,
        seller_name: part.seller_name,
      });
    });

    if (parts.length > 0) {
      Auth.updateUI();
      Toast.success(`เพิ่มชิ้นส่วนที่เลือกไว้ ${parts.length} รายการลงตะกร้าแล้ว!`);
    }
  },

};

// === เริ่มต้นเมื่อโหลดหน้าเว็บเสร็จ ===
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('category-list')) {
    Builder.init();

    // ช่องค้นหา
    document.getElementById('parts-search')?.addEventListener('input', () => {
      Builder.renderPartsList();
    });

    // ตัวกรองเรียงลำดับ
    document.getElementById('sort-filter')?.addEventListener('change', () => {
      Builder.renderPartsList();
    });

    // ปุ่มล้างตัวกรองทั้งหมดกลับเป็นค่าเริ่มต้น
    document.getElementById('filter-reset-btn')?.addEventListener('click', () => {
      Builder.resetCategoryFilters();
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

    document.getElementById('cart-add-all-btn')?.addEventListener('click', () => {
      Builder.addAllToCart();
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

    document.getElementById('cross-match-btn')?.addEventListener('click', () => {
      Builder.openCrossMatchModal();
    });

    document.getElementById('close-cross-match-modal')?.addEventListener('click', () => {
      const modal = document.getElementById('cross-match-modal');
      if (modal) modal.style.display = 'none';
    });
  }
});
