// Logistics Tracking Service (Dual Mode: TrackingMore API + Courier Simulator)

/**
 * Detect courier name by tracking number format
 * @param {string} trackingNumber 
 * @returns {string} Courier name
 */
exports.detectCourier = (trackingNumber) => {
  const code = (trackingNumber || '').trim().toUpperCase();
  if (code.startsWith('TH') || code.startsWith('FLA')) return 'Flash Express';
  if (code.startsWith('KERRY') || code.startsWith('SHP') || code.startsWith('KER')) return 'Kerry Express';
  if (code.startsWith('JNT') || code.startsWith('83') || code.startsWith('82')) return 'J&T Express';
  if (code.startsWith('E') || code.startsWith('R') || code.startsWith('O')) return 'ไปรษณีย์ไทย (Thailand Post EMS)';
  return 'Standard Courier';
};

/**
 * Get direct official web tracking URL for Thai couriers (100% Free & Always Accurate)
 * @param {string} trackingNumber 
 * @param {string} courierName 
 * @returns {string} Direct tracking web URL
 */
exports.getCourierDirectUrl = (trackingNumber, courierName) => {
  const code = (trackingNumber || '').trim();
  const courier = (courierName || exports.detectCourier(code)).toLowerCase();

  if (courier.includes('flash')) {
    return `https://www.flashexpress.co.th/tracking/?se=${encodeURIComponent(code)}`;
  }
  if (courier.includes('kerry') || courier.includes('kex')) {
    return `https://th.kerryexpress.com/th/track/?track=${encodeURIComponent(code)}`;
  }
  if (courier.includes('post') || courier.includes('ems') || courier.includes('ไปรษณีย์')) {
    return `https://track.thailandpost.co.th/?trackNumber=${encodeURIComponent(code)}`;
  }
  if (courier.includes('j&t') || courier.includes('jnt')) {
    return `https://www.jtexpress.co.th/service/track?bills=${encodeURIComponent(code)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent('เช็คพัสดุ ' + code)}`;
};

/**
 * Get tracking status and checkpoint events
 * @param {string} trackingNumber 
 * @param {string} courierName 
 * @param {Date|string} orderShippedAt
 */
exports.getTrackingStatus = async (trackingNumber, courierName, orderShippedAt) => {
  if (!trackingNumber) {
    return { success: false, error: 'Tracking number is required' };
  }

  const detectedCourier = courierName || exports.detectCourier(trackingNumber);
  const directTrackingUrl = exports.getCourierDirectUrl(trackingNumber, detectedCourier);
  const apiKey = process.env.TRACKING_API_KEY;

  // 1. Production Mode with TrackingMore API
  if (apiKey && !apiKey.includes('your_')) {
    try {
      const fetch = (await import('node-fetch')).default || global.fetch;
      const response = await fetch(`https://api.trackingmore.com/v4/trackings/get?tracking_numbers=${trackingNumber}`, {
        headers: {
          'Tracking-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data && data.data && data.data.length > 0) {
        const item = data.data[0];
        return {
          success: true,
          mode: 'production',
          trackingNumber,
          courier: item.courier_code || detectedCourier,
          directTrackingUrl,
          status: item.delivery_status || 'in_transit',
          events: (item.origin_info?.trackinfo || []).map(ev => ({
            time: ev.Date,
            location: ev.Details || ev.checkpoint_status,
            description: ev.StatusDescription
          }))
        };
      }
    } catch (err) {
      console.warn('⚠️ TrackingMore API error, falling back to simulator:', err.message);
    }
  }

  // 2. Simulator Mode with realistic milestones
  const shipTime = orderShippedAt ? new Date(orderShippedAt).getTime() : Date.now() - 3600000;
  const now = Date.now();
  const diffHours = (now - shipTime) / (1000 * 60 * 60);

  const events = [
    {
      time: new Date(shipTime).toISOString().replace('T', ' ').substring(0, 19),
      location: 'สาขาต้นทางผู้ส่ง',
      description: 'บริษัทขนส่งเข้ารับพัสดุเรียบร้อยแล้ว'
    }
  ];

  let status = 'shipped';
  let statusText = 'ผู้ขายจัดส่งพัสดุแล้ว';

  if (diffHours >= 1) {
    events.push({
      time: new Date(shipTime + 1800000).toISOString().replace('T', ' ').substring(0, 19),
      location: 'ศูนย์กระจายสินค้ากลาง (Hub Center)',
      description: 'พัสดุถึงศูนย์คัดแยกสินค้าและกำลังส่งต่อไปยังศูนย์ปลายทาง'
    });
    status = 'in_transit';
    statusText = 'พัสดุอยู่ระหว่างการขนส่ง';
  }

  if (diffHours >= 2) {
    events.push({
      time: new Date(shipTime + 3600000).toISOString().replace('T', ' ').substring(0, 19),
      location: 'สาขาปลายทางผู้รับ',
      description: 'พนักงานกำลังนำจ่ายพัสดุให้แก่ผู้รับ'
    });
    status = 'out_for_delivery';
    statusText = 'พัสดุอยู่ระหว่างนำจ่าย';
  }

  return {
    success: true,
    mode: 'simulator',
    trackingNumber,
    courier: detectedCourier,
    directTrackingUrl,
    status,
    statusText,
    events: events.reverse() // latest first
  };
};
