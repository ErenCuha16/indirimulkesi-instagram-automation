const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PRODUCT_IMAGE_URL =
  'https://cdn.dsmcdn.com/ty1835/prod/QC_ENRICHMENT/20260303/16/479bb6f7-fdba-3544-8e6d-b554ad3d744b/1_org_zoom.jpg';
const PRODUCT_NAME = "Erkek 7'li Kısa Çorap K4600AZNS";
const SELLER_NAME = 'Defacto';
const DISCOUNT_TEXT = '%30 İNDİRİM';
const PRICE_NOW = '279,99 TL';
const PRICE_WAS = '399,99 TL';

const OUT_PATH = path.join(__dirname, 'output', 'deal-post.png');
const SIZE = 1080;

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function main() {
  fs.mkdirSync(path.join(__dirname, 'output'), { recursive: true });

  const res = await fetch(PRODUCT_IMAGE_URL);
  if (!res.ok) throw new Error(`Ürün görseli indirilemedi: ${res.status}`);
  const productImageBuffer = Buffer.from(await res.arrayBuffer());

  // Ürün görselini kare bir tuval içine, üstte/altta bant bırakacak şekilde ortala
  const productResized = await sharp(productImageBuffer)
    .resize(SIZE, 760, { fit: 'contain', background: '#ffffff' })
    .toBuffer();

  const overlaySvg = `
  <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    <!-- Üst bant: marka/niş -->
    <rect x="0" y="0" width="${SIZE}" height="90" fill="#111111" />
    <text x="40" y="58" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="#ffffff">indirimulkesi</text>

    <!-- İndirim rozeti -->
    <rect x="${SIZE - 300}" y="120" width="260" height="80" rx="14" fill="#e8112d" />
    <text x="${SIZE - 170}" y="172" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#ffffff" text-anchor="middle">${escapeXml(DISCOUNT_TEXT)}</text>

    <!-- Alt bilgi bandı -->
    <rect x="0" y="850" width="${SIZE}" height="230" fill="#111111" />

    <text x="40" y="905" font-family="Arial, sans-serif" font-size="38" font-weight="bold" fill="#ffffff">${escapeXml(PRODUCT_NAME)}</text>
    <text x="40" y="955" font-family="Arial, sans-serif" font-size="30" fill="#cccccc">Satıcı: ${escapeXml(SELLER_NAME)}</text>

    <text x="40" y="1015" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="#4ade80">${escapeXml(PRICE_NOW)}</text>
    <text x="${40 + PRICE_NOW.length * 27 + 20}" y="1015" font-family="Arial, sans-serif" font-size="30" fill="#999999" text-decoration="line-through">${escapeXml(PRICE_WAS)}</text>
  </svg>`;

  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: '#ffffff',
    },
  })
    .composite([
      { input: productResized, top: 90, left: 0 },
      { input: Buffer.from(overlaySvg), top: 0, left: 0 },
    ])
    .png()
    .toFile(OUT_PATH);

  console.log('Görsel oluşturuldu:', OUT_PATH);
}

main().catch((err) => {
  console.error('Hata:', err.message);
  process.exit(1);
});
