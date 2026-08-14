const { loadEnv } = require('../lib/load-env');
loadEnv();

const { getOrganizations, getChannels } = require('../lib/buffer-client');

async function main() {
  const apiKey = process.env.BUFFER_API_KEY;
  if (!apiKey) {
    console.error('BUFFER_API_KEY bulunamadı (.env dosyasını kontrol et).');
    process.exit(1);
  }

  const orgs = await getOrganizations(apiKey);
  console.log('Organizasyonlar:', orgs);

  for (const org of orgs) {
    const channels = await getChannels(apiKey, org.id);
    console.log(`\n"${org.name}" (${org.id}) altındaki kanallar:`);
    for (const ch of channels) {
      console.log(`  - [${ch.service}] ${ch.name}  =>  id: ${ch.id}`);
    }
  }
}

main().catch((err) => {
  console.error('Hata:', err.message);
  process.exit(1);
});
