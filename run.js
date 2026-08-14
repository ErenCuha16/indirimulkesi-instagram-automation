const path = require('path');
const { loadEnv } = require('./lib/load-env');
loadEnv();

const { findDiscountedProducts, CATEGORY_QUERIES } = require('./lib/find-deal');
const { makeDealImage } = require('./lib/make-image');
const { uploadImage } = require('./lib/cloudinary-client');
const { createPost } = require('./lib/buffer-client');
const postedLog = require('./lib/posted-log');

const CHANNEL_ID = '6a7d0aceb2d9d5774368eaaa'; // indirimulkesi (Instagram)
const LOG_PATH = path.join(__dirname, 'posted-log.json');
const TMP_SCRAPE_FILE = path.join(__dirname, '.firecrawl-tmp', 'search.md');
const IMAGE_PATH = path.join(__dirname, 'output', 'deal-post.png');
const MAX_CATEGORY_ATTEMPTS = CATEGORY_QUERIES.length;

function parseTLPrice(str) {
  if (!str) return null;
  const cleaned = String(str)
    .replace(/[^0-9.,]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

function scoreAndPick(products) {
  const scored = products
    .filter((p) => p && p.productUrl && p.imageUrl && p.name)
    .filter((p) => !postedLog.has(LOG_PATH, p.productUrl))
    .map((p) => {
      const now = parseTLPrice(p.priceNow);
      const was = parseTLPrice(p.priceWas);
      const discountPercent = now && was && was > now ? ((was - now) / was) * 100 : 0;
      return { ...p, discountPercent };
    })
    .filter((p) => p.discountPercent > 0)
    .sort((a, b) => b.discountPercent - a.discountPercent);

  return scored[0] || null;
}

function buildCaption(product) {
  const discountLabel =
    product.discountText || `%${Math.round(product.discountPercent)} İndirim`;
  return `🔥 ${discountLabel} Fırsatı!

${product.name}
${product.priceNow} (${product.priceWas} yerine)

Daha fazla indirim için bizi takip edin! 👀

Ürün: ${product.productUrl}`;
}

async function main() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
  const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;
  const bufferApiKey = process.env.BUFFER_API_KEY;

  if (!cloudName || !cloudinaryApiKey || !cloudinaryApiSecret || !bufferApiKey) {
    console.error('Eksik ortam değişkeni (.env dosyasını kontrol et).');
    process.exit(1);
  }

  let chosen = null;
  for (let attempt = 0; attempt < MAX_CATEGORY_ATTEMPTS && !chosen; attempt++) {
    console.log(`Deneme ${attempt + 1}: Trendyol'da indirim taranıyor...`);
    const { query, products } = await findDiscountedProducts({ tmpFile: TMP_SCRAPE_FILE });
    console.log(`"${query}" için ${products.length} indirimli ürün bulundu.`);
    chosen = scoreAndPick(products);
  }

  if (!chosen) {
    console.log('Paylaşılabilecek yeni bir indirim bulunamadı (hepsi daha önce paylaşılmış olabilir). Bu çalıştırma atlanıyor.');
    return;
  }

  console.log('Seçilen ürün:', chosen.name, '-', chosen.discountText || `%${Math.round(chosen.discountPercent)}`);

  const imagePath = await makeDealImage({
    productImageUrl: chosen.imageUrl,
    productName: chosen.name,
    sellerName: chosen.seller || 'Bilinmiyor',
    discountText: chosen.discountText || `%${Math.round(chosen.discountPercent)} İNDİRİM`,
    priceNow: chosen.priceNow,
    priceWas: chosen.priceWas,
    outPath: IMAGE_PATH,
  });
  console.log('Görsel oluşturuldu:', imagePath);

  const uploadResult = await uploadImage(imagePath, {
    cloudName,
    apiKey: cloudinaryApiKey,
    apiSecret: cloudinaryApiSecret,
  });
  console.log('Cloudinary\'e yüklendi:', uploadResult.secure_url);

  const result = await createPost(bufferApiKey, {
    channelId: CHANNEL_ID,
    text: buildCaption(chosen),
    imageUrl: uploadResult.secure_url,
    mode: 'shareNow',
  });

  if (result.message) {
    console.error('Buffer hata döndürdü:', result.message);
    process.exit(1);
  }

  console.log('Instagram\'da paylaşıldı:', result.post);
  postedLog.append(LOG_PATH, chosen.productUrl);
}

main().catch((err) => {
  console.error('Hata:', err.message);
  process.exit(1);
});
