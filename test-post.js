const { loadEnv } = require('./lib/load-env');
loadEnv();

const { createPost } = require('./lib/buffer-client');

const CHANNEL_ID = '6a7d0aceb2d9d5774368eaaa'; // indirimulkesi (Instagram)
const TEST_IMAGE_URL = 'https://picsum.photos/1080/1080';
const TEST_TEXT = 'Bu bir test gönderisidir 🚀 (Buffer API entegrasyon testi)';

async function main() {
  const apiKey = process.env.BUFFER_API_KEY;
  if (!apiKey) {
    console.error('BUFFER_API_KEY bulunamadı (.env dosyasını kontrol et).');
    process.exit(1);
  }

  const result = await createPost(apiKey, {
    channelId: CHANNEL_ID,
    text: TEST_TEXT,
    imageUrl: TEST_IMAGE_URL,
    mode: 'addToQueue',
  });

  if (result.message) {
    console.error('Buffer hata döndürdü:', result.message);
    process.exit(1);
  }

  console.log('Gönderi kuyruğa eklendi:');
  console.log(result.post);
}

main().catch((err) => {
  console.error('Hata:', err.message);
  process.exit(1);
});
