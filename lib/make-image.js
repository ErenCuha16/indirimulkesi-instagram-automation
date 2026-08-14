const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SIZE = 1080;

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function makeDealImage({ productImageUrl, productName, sellerName, discountText, priceNow, priceWas, outPath }) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const res = await fetch(productImageUrl);
  if (!res.ok) throw new Error(`Ürün görseli indirilemedi: ${res.status}`);
  const productImageBuffer = Buffer.from(await res.arrayBuffer());

  const productResized = await sharp(productImageBuffer)
    .resize(SIZE, 760, { fit: 'contain', background: '#ffffff' })
    .toBuffer();

  const overlaySvg = `
  <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${SIZE}" height="90" fill="#111111" />
    <text x="40" y="58" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="#ffffff">indirimulkesi</text>

    <rect x="${SIZE - 300}" y="120" width="260" height="80" rx="14" fill="#e8112d" />
    <text x="${SIZE - 170}" y="172" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#ffffff" text-anchor="middle">${escapeXml(discountText)}</text>

    <rect x="0" y="850" width="${SIZE}" height="230" fill="#111111" />

    <text x="40" y="905" font-family="Arial, sans-serif" font-size="38" font-weight="bold" fill="#ffffff">${escapeXml(productName)}</text>
    <text x="40" y="955" font-family="Arial, sans-serif" font-size="30" fill="#cccccc">Satıcı: ${escapeXml(sellerName)}</text>

    <text x="40" y="1015" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="#4ade80">${escapeXml(priceNow)}</text>
    <text x="${40 + String(priceNow).length * 27 + 20}" y="1015" font-family="Arial, sans-serif" font-size="30" fill="#999999" text-decoration="line-through">${escapeXml(priceWas)}</text>
  </svg>`;

  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: '#ffffff' },
  })
    .composite([
      { input: productResized, top: 90, left: 0 },
      { input: Buffer.from(overlaySvg), top: 0, left: 0 },
    ])
    .png()
    .toFile(outPath);

  return outPath;
}

module.exports = { makeDealImage };
