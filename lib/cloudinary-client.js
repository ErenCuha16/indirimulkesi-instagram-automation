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

module.exports = { uploadImage };
