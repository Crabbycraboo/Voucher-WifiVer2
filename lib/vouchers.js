const crypto = require('crypto');

function generateCodes(count, prefix = 'CAFE') {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    codes.push(`${prefix}-${rand}`);
  }
  return codes;
}

module.exports = { generateCodes };
