const fs = require('fs');

const MAX_ENTRIES = 300;

function load(logPath) {
  if (!fs.existsSync(logPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(logPath, 'utf8'));
  } catch {
    return [];
  }
}

function has(logPath, productUrl) {
  return load(logPath).some((entry) => entry.productUrl === productUrl);
}

function append(logPath, productUrl) {
  const entries = load(logPath);
  entries.push({ productUrl, postedAt: new Date().toISOString() });
  const trimmed = entries.slice(-MAX_ENTRIES);
  fs.writeFileSync(logPath, JSON.stringify(trimmed, null, 2));
}

module.exports = { load, has, append };
