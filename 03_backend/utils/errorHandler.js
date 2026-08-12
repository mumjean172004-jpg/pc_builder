function sendServerError(res, error) {
  console.error(error);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง' });
}

module.exports = { sendServerError };
