const { uploadRawJson, fetchRawJson } = require('./cloudinary-client');

const PUBLIC_ID = 'indirimulkesi-posted-log';
const MAX_ENTRIES = 300;

async function load(cloudinaryConfig) {
  const data = await fetchRawJson(cloudinaryConfig.cloudName, PUBLIC_ID);
  return Array.isArray(data) ? data : [];
}

async function has(cloudinaryConfig, productUrl) {
  const entries = await load(cloudinaryConfig);
  return entries.some((entry) => entry.productUrl === productUrl);
}

async function append(cloudinaryConfig, productUrl) {
  const entries = await load(cloudinaryConfig);
  entries.push({ productUrl, postedAt: new Date().toISOString() });
  const trimmed = entries.slice(-MAX_ENTRIES);
  await uploadRawJson(PUBLIC_ID, trimmed, cloudinaryConfig);
  return trimmed;
}

module.exports = { load, has, append };
