const fs = require('fs');
const crypto = require('crypto');

async function uploadImage(filePath, { cloudName, apiKey, apiSecret }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha256')
    .update(paramsToSign + apiSecret)
    .digest('hex');

  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(filePath)]));
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Cloudinary yükleme hatası: ${JSON.stringify(json)}`);
  }

  return json; // json.secure_url
}

// Sabit public_id'li bir "raw" dosya (JSON) yükler/üzerine yazar. Bunu, çalıştırmalar
// arasında paylaşılan tekrar-önleme kaydını (posted-log) tutmak için kullanıyoruz —
// git push erişimine ihtiyaç duymadan, hem yerelde hem bulut ajanında çalışır.
async function uploadRawJson(publicId, dataObj, { cloudName, apiKey, apiSecret }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `overwrite=true&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha256')
    .update(paramsToSign + apiSecret)
    .digest('hex');

  const form = new FormData();
  form.append('file', new Blob([JSON.stringify(dataObj)], { type: 'application/json' }));
  form.append('public_id', publicId);
  form.append('overwrite', 'true');
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
    method: 'POST',
    body: form,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Cloudinary raw yükleme hatası: ${JSON.stringify(json)}`);
  }
  return json;
}

async function fetchRawJson(cloudName, publicId) {
  const url = `https://res.cloudinary.com/${cloudName}/raw/upload/${publicId}?t=${Date.now()}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Cloudinary raw okuma hatası: ${res.status}`);
  const text = await res.text();
  return JSON.parse(text);
}

module.exports = { uploadImage, uploadRawJson, fetchRawJson };
