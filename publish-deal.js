const path = require('path');
const { loadEnv } = require('./lib/load-env');
loadEnv();

const { uploadImage } = require('./lib/cloudinary-client');
const { createPost } = require('./lib/buffer-client');

const CHANNEL_ID = '6a7d0aceb2d9d5774368eaaa'; // indirimulkesi (Instagram)
const IMAGE_PATH = path.join(__dirname, 'output', 'deal-post.png');
const PRODUCT_LINK = 'https://www.trendyol.com/defacto/erkek-7-li-kisa-corap-k4600azns-p-1143474635?boutiqueId=61&merchantId=1188';

const CAPTION = `🔥 %30 İndirim Fırsatı!

Defacto Erkek 7'li Kısa Çorap K4600AZNS
279,99 TL (399,99 TL yerine)

Daha fazla indirim için bizi takip edin! 👀

Ürün: ${PRODUCT_LINK}`;

async function main() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const bufferApiKey = process.env.BUFFER_API_KEY;

  if (!cloudName || !apiKey || !apiSecret || !bufferApiKey) {
    console.error('Eksik ortam değişkeni (.env dosyasını kontrol et).');
    process.exit(1);
  }

  console.log('Görsel Cloudinary\'e yükleniyor...');
  const uploadResult = await uploadImage(IMAGE_PATH, { cloudName, apiKey, apiSecret });
  console.log('Yüklendi:', uploadResult.secure_url);

  console.log('Instagram\'da paylaşılıyor...');
  const result = await createPost(bufferApiKey, {
    channelId: CHANNEL_ID,
    text: CAPTION,
    imageUrl: uploadResult.secure_url,
    mode: 'shareNow',
  });

  if (result.message) {
    console.error('Buffer hata döndürdü:', result.message);
    process.exit(1);
  }

  console.log('Paylaşıldı:', result.post);
}

main().catch((err) => {
  console.error('Hata:', err.message);
  process.exit(1);
});
