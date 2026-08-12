/**
 * PC Builder Pro — ฟังก์ชันหลักของแอปพลิเคชัน
 * ตัวเรียก API, สถานะล็อกอิน, การแจ้งเตือน, และฟังก์ชันช่วยเหลือ
 */

// === ตั้งค่า API ===
const API_BASE = '/api';

// === ตะกร้าสินค้ามือสอง ===
const Cart = {
  getItems() {
    try {
      return JSON.parse(localStorage.getItem('pc_builder_cart') || '[]');
    } catch {
      return [];
    }
  },

  saveItems(items) {
    localStorage.setItem('pc_builder_cart', JSON.stringify(items));
    this.updateNavbarBadge();
  },

  addItem(item) {
    const items = this.getItems();
    const exists = items.find(i => i.product_id === item.product_id);
    if (!exists) {
      items.push(item);
      this.saveItems(items);
      Toast.success(`เพิ่ม "${item.name}" ลงตะกร้าแล้ว`);
    } else {
      Toast.info(`"${item.name}" อยู่ในตะกร้าแล้ว`);
    }
  },

  removeItem(productId) {
    let items = this.getItems();
    items = items.filter(i => i.product_id !== productId);
    this.saveItems(items);
    Toast.success('ลบสินค้าออกจากตะกร้าแล้ว');
    this.renderCartModalList();
  },

  clear() {
    this.saveItems([]);
    this.updateNavbarBadge();
    const list = document.getElementById('cart-modal-list');
    if (list) this.renderCartModalList();
  },

  getCount() {
    return this.getItems().length;
  },

  updateNavbarBadge() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
      const count = this.getCount();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  },

  showCartModal() {
    let modal = document.getElementById('cart-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cart-modal';
      modal.className = 'modal-backdrop';
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; align-items: center;
        justify-content: center; z-index: 2000;
      `;
      modal.innerHTML = `
        <div class="modal-content" style="
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-lg); width: 90%; max-width: 600px;
          padding: 1.5rem; max-height: 85vh; display: flex; flex-direction: column;
          box-shadow: var(--shadow); position: relative;
        ">
          <button id="cart-modal-close" style="
            position: absolute; top: 1rem; right: 1rem; background: none; border: none;
            color: var(--text-muted); font-size: 1.5rem; cursor: pointer;
          ">&times;</button>
          
          <h3 style="margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path></svg>
            ตะกร้าสินค้ามือสองของคุณ
          </h3>

          <div id="cart-modal-list" style="overflow-y: auto; flex: 1; margin-bottom: 1rem; min-height: 150px;">
            <!-- รายการสินค้า -->
          </div>

          <div style="border-top: 1px solid var(--border); padding-top: 1rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <span style="font-weight: bold; font-size: 1.1rem;">ราคารวมทั้งหมด:</span>
            <span id="cart-modal-total" style="font-weight: bold; font-size: 1.4rem; color: var(--success);">฿0</span>
          </div>

          <div class="flex gap-1">
            <button class="btn btn-secondary" id="cart-modal-clear" style="flex: 1;"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> ล้างตะกร้า</button>
            <button class="btn btn-primary" id="cart-modal-checkout" style="flex: 2;"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg> ดำเนินการสั่งซื้อ</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#cart-modal-close').addEventListener('click', () => {
        modal.style.display = 'none';
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });

      modal.querySelector('#cart-modal-clear').addEventListener('click', () => {
        if (confirm('คุณต้องการล้างตะกร้าสินค้าทั้งหมดใช่หรือไม่?')) {
          this.clear();
        }
      });

      modal.querySelector('#cart-modal-checkout').addEventListener('click', () => {
        const items = this.getItems();
        if (items.length === 0) {
          Toast.warning('ไม่มีสินค้าในตะกร้า');
          return;
        }

        if (!Auth.isLoggedIn()) {
          Toast.warning('กรุณาเข้าสู่ระบบก่อนดำเนินการสั่งจองสินค้า');
          modal.style.display = 'none';
          window.location.href = '/login.html';
          return;
        }

        // แทนที่เนื้อหากล่องตะกร้าด้วยฟอร์มเลือกวิธีจัดส่ง กรอกที่อยู่ และเบอร์โทร
        const cartContent = modal.querySelector('.modal-content');
        const cartTotal = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);

        cartContent.innerHTML = `
          <div style="display: flex; flex-direction: column; height: 100%; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 1rem;">
              <h3 style="margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"></path><path d="M12 22V12"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><path d="m7.5 4.27 9 5.15"></path></svg> เลือกรูปแบบการจัดส่ง & ติดต่อ</h3>
              <button id="checkout-back-btn" class="btn btn-ghost btn-sm" style="font-size: 0.85rem; padding: 2px 8px; display: inline-flex; align-items: center; gap: 4px;"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px;"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg> ย้อนกลับ</button>
            </div>
            
            <div style="flex: 1; display: flex; flex-direction: column; gap: 12px; margin-bottom: 1rem;">
              <div>
                <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 6px; font-weight: bold;">เลือกรูปแบบการจัดส่ง :</label>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; font-size: 0.88rem;">
                    <input type="radio" name="shipping-method" value="express" checked>
                    <span style="display: inline-flex; align-items: center; gap: 6px;"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:16px;height:16px;flex-shrink:0;"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path><path d="M15 18H9"></path><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path><circle cx="17" cy="18" r="2"></circle><circle cx="7" cy="18" r="2"></circle></svg> <strong>จัดส่งพัสดุทั่วไป (โอนเงินก่อน)</strong> - Kerry / Flash / ไปรษณีย์ไทย</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; font-size: 0.88rem;">
                    <input type="radio" name="shipping-method" value="hand_pickup">
                    <span style="display: inline-flex; align-items: center; gap: 6px;"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:16px;height:16px;flex-shrink:0;"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> <strong>นัดรับสินค้าด้วยตัวเอง (รับมือ)</strong> - นัดเจอตรวจเช็กสภาพและทดลองเปิดไฟ</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; font-size: 0.88rem;">
                    <input type="radio" name="shipping-method" value="cod">
                    <span style="display: inline-flex; align-items: center; gap: 6px;"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:16px;height:16px;flex-shrink:0;"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"></path><path d="M12 22V12"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><path d="m7.5 4.27 9 5.15"></path></svg> <strong>เก็บเงินปลายทาง (COD)</strong> - ชำระเงินเมื่อพัสดุมาถึงบ้าน</span>
                  </label>
                </div>
              </div>

              <div>
                <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px; font-weight: bold;">เบอร์โทรศัพท์ติดต่อ :</label>
                <input type="text" id="checkout-phone" placeholder="เช่น 081-234-5678" style="width: 100%; padding: 0.6rem; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.9rem;">
              </div>

              <div id="pickup-location-group" style="display: none;">
                <label style="display: flex; align-items: center; gap: 4px; font-size: 0.85rem; color: #3b82f6; margin-bottom: 4px; font-weight: bold;"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px;"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle></svg> สถานที่นัดพบ (ระบุจุดนัดรับที่สะดวก) :</label>
                <input type="text" id="checkout-pickup-location" placeholder="เช่น สถานี BTS สยาม / เซ็นทรัลลาดพร้าว" style="width: 100%; padding: 0.6rem; border-radius: var(--radius); border: 1px solid #3b82f6; background: var(--bg-secondary); color: var(--text-primary); font-size: 0.9rem;">
              </div>

              <div>
                <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px; font-weight: bold;">ที่อยู่จัดส่ง / ข้อมูลเพิ่มเติม :</label>
                <textarea id="checkout-address" placeholder="ระบุบ้านเลขที่ ถนน จังหวัด หรือรายละเอียดนัดพบ" rows="3" style="width: 100%; padding: 0.6rem; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); resize: none; font-family: inherit; font-size: 0.9rem;"></textarea>
              </div>
            </div>

            <button class="btn btn-primary" id="checkout-confirm-btn" style="width: 100%; padding: 0.75rem; font-size: 1rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg> ยืนยันการสั่งจองและเปิดแชท (ราคารวม ฿${cartTotal.toLocaleString()})
            </button>
          </div>
        `;

        // สลับซ่อน/แสดงช่องนัดรับสินค้า
        const methodInputs = cartContent.querySelectorAll('input[name="shipping-method"]');
        const pickupGroup = cartContent.querySelector('#pickup-location-group');
        methodInputs.forEach(input => {
          input.addEventListener('change', () => {
            if (input.value === 'hand_pickup') {
              pickupGroup.style.display = 'block';
            } else {
              pickupGroup.style.display = 'none';
            }
          });
        });

        // ปุ่มย้อนกลับ
        cartContent.querySelector('#checkout-back-btn').addEventListener('click', () => {
          this.showCartModal();
        });

        // ปุ่มยืนยันสั่งจอง
        cartContent.querySelector('#checkout-confirm-btn').addEventListener('click', async () => {
          const phone = cartContent.querySelector('#checkout-phone').value.trim();
          const address = cartContent.querySelector('#checkout-address').value.trim();
          const selectedMethod = cartContent.querySelector('input[name="shipping-method"]:checked').value;
          const pickupLoc = cartContent.querySelector('#checkout-pickup-location').value.trim();

          if (!phone || !address) {
            Toast.warning('กรุณากรอกเบอร์โทรศัพท์และที่อยู่จัดส่งให้ครบถ้วน');
            return;
          }

          const processBookingSubmit = async (isRiskAccepted = false) => {
            const confirmBtn = cartContent.querySelector('#checkout-confirm-btn');
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'กำลังส่งข้อมูลการจอง...';

            try {
              const payload = {
                items: items.map(it => ({ product_id: it.product_id, price: it.price })),
                shipping_address: address,
                contact_phone: phone,
                shipping_method: selectedMethod,
                pickup_location: selectedMethod === 'hand_pickup' ? pickupLoc : null,
                is_risk_accepted: isRiskAccepted
              };

              const res = await API.post('/bookings', payload);
              Toast.success('ส่งคำจองสินค้าสำเร็จ! เปิดห้องแชทเจรจาเรียบร้อย');
              this.clear();
              modal.style.display = 'none';
              window.location.href = '/inbox.html';
            } catch (error) {
              console.error('Checkout error:', error);
              Toast.error(error.message || 'เกิดข้อผิดพลาดในการทำรายการสั่งจอง');
              confirmBtn.disabled = false;
              confirmBtn.textContent = `ยืนยันการสั่งจองและเปิดแชท (ราคารวม ฿${cartTotal.toLocaleString()})`;
            }
          };

          // หากเลือกจัดส่งพัสดุโอนเงินก่อน และสินค้ามีราคาสูง >= 3,000 บาท เด้ง High-Value Risk Warning Modal
          if (selectedMethod === 'express' && cartTotal >= 3000) {
            Auth.showHighValueRiskWarningModal(
              cartTotal,
              () => processBookingSubmit(true),
              () => {
                cartContent.querySelector('input[value="hand_pickup"]').checked = true;
                pickupGroup.style.display = 'block';
                Toast.info('ปรับเปลี่ยนรูปแบบเป็น "นัดรับสินค้าด้วยตัวเอง (รับมือ)" เรียบร้อยแล้ว');
              }
            );
          } else {
            processBookingSubmit(false);
          }
        });
      });
    }

    modal.style.display = 'flex';
    this.renderCartModalList();
  },

  renderCartModalList() {
    const list = document.getElementById('cart-modal-list');
    const totalEl = document.getElementById('cart-modal-total');
    if (!list) return;

    const items = this.getItems();
    if (items.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 3rem 0;">
          <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">ไม่มีสินค้าในตะกร้า</p>
          <p style="font-size: 0.9rem;">เพิ่มสินค้าจากการจัดสเปคเพื่อเริ่มต้นสั่งซื้อ</p>
        </div>
      `;
      if (totalEl) totalEl.textContent = '฿0';
      return;
    }

    let total = 0;
    list.innerHTML = items.map(item => {
      total += parseFloat(item.price);
      let conditionText = '';
      switch (item.condition) {
        case 'new': conditionText = 'ของใหม่'; break;
        case 'used_90': conditionText = 'มือสอง 90%+'; break;
        case 'used_80': conditionText = 'มือสอง 80%+'; break;
        case 'used_70': conditionText = 'มือสอง 70%+'; break;
        default: conditionText = 'มือสอง';
      }

      return `
        <div style="
          display: flex; justify-content: space-between; align-items: center;
          padding: 0.75rem; border-bottom: 1px solid var(--border);
          background: rgba(255,255,255,0.02); margin-bottom: 0.5rem; border-radius: var(--radius);
        ">
          <div>
            <div style="font-weight: 600; font-size: 0.95rem;">${escapeHtml(item.name)}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              ผู้ขาย: <span style="color: var(--text-secondary);">${escapeHtml(item.seller_name)}</span> · 
              สภาพ: <span style="color: var(--warning);">${conditionText}</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-weight: 600; color: var(--success);">${formatPrice(item.price)}</span>
            <button class="btn btn-outline" onclick="Cart.removeItem(${item.product_id})" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; min-height: unset; border-color: var(--danger); color: var(--danger); background: none; cursor: pointer;">ลบ</button>
          </div>
        </div>
      `;
    }).join('');

    if (totalEl) totalEl.textContent = formatPrice(total);
  }
};

// === สถานะล็อกอิน ===
const Auth = {
  getToken() {
    return localStorage.getItem('pc_builder_token');
  },

  setToken(token) {
    localStorage.setItem('pc_builder_token', token);
  },

  clearToken() {
    localStorage.removeItem('pc_builder_token');
    localStorage.removeItem('pc_builder_user');
  },

  showHighValueRiskWarningModal(cartTotal, onAccept, onSwitchToPickup) {
    let riskModal = document.getElementById('high-value-risk-modal');
    if (riskModal) riskModal.remove();

    riskModal = document.createElement('div');
    riskModal.id = 'high-value-risk-modal';
    riskModal.className = 'modal-backdrop';
    riskModal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8); display: flex; align-items: center;
      justify-content: center; z-index: 3500; padding: 1rem;
    `;

    riskModal.innerHTML = `
      <div style="
        background: var(--bg-card, #1e293b); border: 2px solid #f59e0b;
        border-radius: 12px; width: 100%; max-width: 520px; padding: 1.5rem;
        box-shadow: 0 10px 30px rgba(245,158,11,0.3); color: var(--text-primary, #f8fafc);
      ">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:2.2rem;height:2.2rem;flex-shrink:0;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
          <div>
            <h3 style="margin: 0; color: #f59e0b; font-size: 1.2rem;">คำเตือนความปลอดภัยสินค้ามูลค่าสูง</h3>
            <span style="font-size: 0.85rem; color: var(--text-secondary, #cbd5e1);">ยอดรวมสินค้า: <strong style="color: #10b981; font-size: 1.1rem;">฿${cartTotal.toLocaleString()}</strong></span>
          </div>
        </div>

        <div style="background: rgba(245,158,11,0.1); border-left: 4px solid #f59e0b; padding: 12px; border-radius: 6px; margin-bottom: 1.25rem; font-size: 0.9rem; line-height: 1.5;">
          เนื่องจากสินค้านี้เป็นอุปกรณ์คอมพิวเตอร์มือสองที่มีราคาสูง การเลือกจัดส่งพัสดุทางไกลแบบโอนเงินก่อนอาจมีความเสี่ยง<br><br>
          <span style="display:inline-flex;align-items:center;gap:6px;"><svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:15px;height:15px;flex-shrink:0;"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg><strong>คำแนะนำจากระบบ:</strong></span> หากเป็นไปได้ แนะนำให้เปลี่ยนไปใช้ทางเลือก <strong>"นัดรับสินค้าด้วยตัวเอง (รับมือ)"</strong> เพื่อเปิดลองไฟและตรวจเช็กสภาพอุปกรณ์ต่อหน้าผู้ขายก่อนชำระเงิน
        </div>

        <div style="display: flex; gap: 10px; flex-direction: column;">
          <button id="risk-switch-pickup-btn" class="btn" style="background: #3b82f6; color: white; padding: 0.75rem; border-radius: 8px; font-weight: bold; border: none; cursor: pointer; font-size: 0.95rem; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> เปลี่ยนเป็นนัดรับสินค้าด้วยตัวเอง (รับมือ)
          </button>
          <button id="risk-accept-btn" class="btn" style="background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid #ef4444; padding: 0.7rem; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.9rem; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg> ยอมรับความเสี่ยงและดำเนินการโอนเงินต่อ
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(riskModal);

    riskModal.querySelector('#risk-switch-pickup-btn').addEventListener('click', () => {
      riskModal.remove();
      if (onSwitchToPickup) onSwitchToPickup();
    });

    riskModal.querySelector('#risk-accept-btn').addEventListener('click', () => {
      riskModal.remove();
      if (onAccept) onAccept();
    });
  },

  async logout() {
    try {
      await API.post('/auth/logout');
    } catch (e) {
      console.error('Logout error:', e);
    }
    this.clearToken();
    window.location.href = '/index.html';
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('pc_builder_user') || 'null');
    } catch {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem('pc_builder_user', JSON.stringify(user));
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  async switchRole(role) {
    try {
      const result = await API.post('/auth/switch-role', { role });
      const user = this.getUser();
      if (user) {
        user.active_role = role;
        this.setUser(user);
      }
      return result;
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  updateUI() {
    const authButtons = document.getElementById('navbar-auth');
    if (!authButtons) return;

    const cartCount = Cart.getItems().length;
    const cartBadgeHtml = `
      <div class="navbar-cart-wrapper" style="position: relative; margin-right: 12px; display: inline-flex; align-items: center;">
        <button class="btn btn-ghost btn-sm" id="cart-nav-btn" style="font-size: 1.1rem; padding: 0.4rem 0.6rem; border: none; background: none; cursor: pointer; display: inline-flex; align-items: center;">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path></svg>
          <span id="cart-badge" style="background: var(--highlight); color: white; border-radius: 50%; padding: 1px 6px; font-size: 0.75rem; position: absolute; top: -5px; right: -5px; display: ${cartCount > 0 ? 'inline-block' : 'none'};">${cartCount}</span>
        </button>
      </div>
    `;

    if (this.isLoggedIn()) {
      const user = this.getUser();
      const roleText = user?.active_role === 'seller' ? 'ผู้ขาย' : 'ผู้ซื้อ';
      const adminLink = user?.role === 'admin' ? '<a href="/admin/index.html" class="btn btn-ghost btn-sm" style="color: #c084fc; margin-right: 6px; display: inline-flex; align-items: center; gap: 4px;"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:15px;height:15px;"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg> แอดมิน</a>' : '';
      authButtons.innerHTML = `
        ${cartBadgeHtml}
        ${adminLink}
        <a href="/inbox.html" class="btn btn-ghost btn-sm" style="margin-right: 6px; display: inline-flex; align-items: center; gap: 4px;"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:15px;height:15px;"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path></svg> ข้อความ</a>
        <a href="/profile.html" class="btn btn-ghost btn-sm" style="display: inline-flex; align-items: center; gap: 4px;"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:15px;height:15px;"><path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="8" r="5"></circle></svg> ${user?.username || 'โปรไฟล์'} <span style="font-size: 0.75rem; background: var(--bg-body); padding: 2px 6px; border-radius: 10px; border: 1px solid var(--border); margin-left: 2px;">${roleText}</span></a>
        <button class="btn btn-outline btn-sm" id="logout-btn" style="margin-left: 6px;">ออกจากระบบ</button>
      `;
      document.getElementById('logout-btn')?.addEventListener('click', () => {
        this.logout();
      });
    } else {
      authButtons.innerHTML = `
        ${cartBadgeHtml}
        <a href="/login.html" class="btn btn-ghost btn-sm">เข้าสู่ระบบ</a>
        <a href="/login.html?register" class="btn btn-primary btn-sm">สมัครสมาชิก</a>
      `;
    }

    document.getElementById('cart-nav-btn')?.addEventListener('click', () => {
      Cart.showCartModal();
    });
  }
};

// === ตัวเรียก API ===
const API = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = Auth.getToken();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        Auth.clearToken();
        window.location.href = '/login.html';
        return;
      }
      throw new Error(data.error || `ข้อผิดพลาด HTTP ${response.status}`);
    }

    return data;
  },

  get(endpoint) {
    return this.request(endpoint);
  },

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body });
  },

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

};

// === การแจ้งเตือนแบบ Toast ===
const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 3000) {
    this.init();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error', 5000); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg) { this.show(msg, 'info'); },
};

// === ฟังก์ชันช่วยเหลือ ===
function formatPrice(price) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getSpecsSummary(specs, category) {
  if (!specs) return '';
  
  let parsedSpecs = specs;
  if (typeof specs === 'string') {
    try {
      parsedSpecs = JSON.parse(specs);
    } catch (e) {
      console.error('Failed to parse specs:', e);
      return '';
    }
  }
  
  switch (category) {
    case 'cpu':
      return `${parsedSpecs.cores || '?'}C/${parsedSpecs.threads || '?'}T · ${parsedSpecs.socket || ''} · ${parsedSpecs.tdp || '?'}W`;
    case 'cpu-cooler':
      return `${parsedSpecs.type === 'aio' ? `${parsedSpecs.radiator_mm}mm AIO` : `พัดลม · ${parsedSpecs.height_mm}mm`} · ${parsedSpecs.tdp_rating}W TDP`;
    case 'motherboard':
      return `${parsedSpecs.socket} · ${parsedSpecs.chipset} · ${parsedSpecs.ram_type} · ${parsedSpecs.form_factor}`;
    case 'ram':
      return `${parsedSpecs.type} · ${parsedSpecs.capacity_gb}GB (${parsedSpecs.modules}x${Math.round(parsedSpecs.capacity_gb / parsedSpecs.modules)}GB) · ${parsedSpecs.speed}`;
    case 'gpu':
      return `${parsedSpecs.vram_gb}GB ${parsedSpecs.vram_type} · ${parsedSpecs.tdp}W · ${parsedSpecs.length_mm}mm`;
    case 'storage':
      return `${parsedSpecs.interface} · ${parsedSpecs.capacity_gb >= 1000 ? (parsedSpecs.capacity_gb / 1000) + 'TB' : parsedSpecs.capacity_gb + 'GB'} · ${parsedSpecs.read_speed}`;
    case 'psu':
      return `${parsedSpecs.wattage}W · ${parsedSpecs.efficiency} · ${parsedSpecs.modularity === 'full' ? 'มอดูลาร์' : 'ไม่มอดูลาร์'}`;
    case 'case':
      return `${parsedSpecs.form_factor} · GPU สูงสุด ${parsedSpecs.max_gpu_length_mm}mm · คูลเลอร์สูงสุด ${parsedSpecs.max_cooler_height_mm}mm`;
    default:
      return Object.values(parsedSpecs).slice(0, 3).join(' · ');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// === เริ่มต้นส่วนแสดงผลล็อกอินเมื่อโหลดหน้าเว็บ ===
document.addEventListener('DOMContentLoaded', () => {
  Auth.updateUI();
});

// === ป้ายแสดงเลขเวอร์ชัน (มุมขวาล่าง, ตัวเล็ก, สีจาง) ===
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    if (!data.version) return;

    const badge = document.createElement('div');
    badge.id = 'app-version-badge';
    badge.textContent = `v${data.version}`;
    badge.style.cssText = [
      'position:fixed', 'bottom:8px', 'right:10px', 'z-index:50',
      'font-size:0.7rem', 'color:#9ca3af', 'opacity:0.5',
      'font-family:monospace', 'pointer-events:none', 'user-select:none'
    ].join(';');
    document.body.appendChild(badge);
  } catch (err) {
    // ไม่แสดงป้ายถ้าเรียก API ไม่สำเร็จ — ไม่ใช่ฟีเจอร์สำคัญ ไม่ควรรบกวนผู้ใช้
  }
});

// === Mobile Menu Toggle ===
document.addEventListener("DOMContentLoaded", () => {
  const mobileBtn = document.getElementById("mobile-menu-btn");
  const navbarLinks = document.querySelector(".navbar-links");
  const navbarAuth = document.getElementById("navbar-auth");

  if (mobileBtn && navbarLinks) {
    mobileBtn.addEventListener("click", () => {
      navbarLinks.classList.toggle("mobile-menu-active");
      if(navbarAuth) {
        navbarAuth.classList.toggle("mobile-menu-active");
      }
    });
  }

  // Init Theme
  ThemeManager.init();
});

// === Theme Manager ===
const ThemeManager = {
  init() {
    const savedTheme = localStorage.getItem('pcbuilder_theme') || 'light';
    this.applyTheme(savedTheme);
    this.injectToggleButton();
  },
  
  applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  },
  
  toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    const newTheme = isDark ? 'light' : 'dark';
    localStorage.setItem('pcbuilder_theme', newTheme);
    this.applyTheme(newTheme);
    
    // Update button icon
    const btn = document.getElementById('theme-toggle-btn');
    if(btn) {
      btn.innerHTML = newTheme === 'dark'
        ? '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>'
        : '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>';
    }
  },
  
  injectToggleButton() {
    const navInner = document.querySelector('.navbar-inner');
    if (!navInner || document.getElementById('theme-toggle-btn')) return;
    
    const isDark = document.body.classList.contains('dark-mode');
    
    const btn = document.createElement('button');
    btn.id = 'theme-toggle-btn';
    btn.className = 'theme-toggle-btn';
    btn.innerHTML = isDark
      ? '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>'
      : '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>';
    btn.onclick = () => this.toggleTheme();
    btn.title = "สลับโหมดมืด/สว่าง";
    
    // Insert before navbar-auth if it exists, otherwise just append
    const authSection = document.getElementById('navbar-auth');
    if(authSection) {
      navInner.insertBefore(btn, authSection);
    } else {
      navInner.appendChild(btn);
    }
  }
};

