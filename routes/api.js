const express = require('express');
const QRCode = require('qrcode');
const { getRouters, pushCodes, getStatus } = require('../lib/ssh');
const { generateCodes } = require('../lib/vouchers');

const router = express.Router();

// Simple password auth middleware
function auth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// List all configured routers (no SSH needed)
router.get('/routers', auth, (req, res) => {
  const routers = getRouters().map(r => ({ id: r.id, name: r.name, host: r.host }));
  res.json(routers);
});

// Get live status from a router
router.get('/routers/:id/status', auth, async (req, res) => {
  try {
    const status = await getStatus(req.params.id);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate codes and push to router
router.post('/vouchers/generate', auth, async (req, res) => {
  const { routerId, count = 10, prefix = 'CAFE' } = req.body;
  if (!routerId) return res.status(400).json({ error: 'routerId required' });

  try {
    const codes = generateCodes(parseInt(count), prefix);
    await pushCodes(routerId, codes);
    res.json({ success: true, codes, count: codes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate printable HTML sheet
router.post('/vouchers/print-sheet', auth, async (req, res) => {
  const { codes, cafeName = 'Cafe WiFi', duration = '2 Hours' } = req.body;
  if (!codes || !codes.length) return res.status(400).json({ error: 'codes required' });

  try {
    const vouchers = await Promise.all(codes.map(async code => {
      const qr = await QRCode.toDataURL(code, { width: 96, margin: 1 });
      return { code, qr };
    }));

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Vouchers - ${cafeName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; background: #fff; padding: 20px; }
  h1 { font-size: 14px; color: #666; margin-bottom: 16px; }
  .grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .voucher {
    border: 1.5px dashed #bbb; border-radius: 8px;
    width: 148px; padding: 10px 8px; text-align: center;
    background: #fff;
  }
  .brand { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #999; margin-bottom: 4px; }
  .code { font-size: 12px; font-weight: bold; letter-spacing: 1.5px; color: #111; margin: 6px 0 4px; }
  .duration { font-size: 9px; color: #666; }
  .scissors { color: #aaa; font-size: 11px; margin-bottom: 12px; }
  @media print {
    .no-print { display: none !important; }
    body { padding: 10px; }
  }
</style>
</head>
<body>
<div class="no-print" style="margin-bottom:16px">
  <button onclick="window.print()" style="padding:10px 24px;font-size:15px;cursor:pointer;background:#111;color:#fff;border:none;border-radius:6px">
    🖨️ Print Vouchers
  </button>
  <span style="margin-left:12px;font-size:13px;color:#666">${vouchers.length} vouchers · ${cafeName}</span>
</div>
<div class="grid">
  ${vouchers.map(v => `
  <div class="voucher">
    <div class="brand">${cafeName}</div>
    <img src="${v.qr}" width="80" height="80" alt="${v.code}">
    <div class="code">${v.code}</div>
    <div class="duration">⏱ ${duration} Free WiFi</div>
  </div>`).join('')}
</div>
</body>
</html>`;

    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
