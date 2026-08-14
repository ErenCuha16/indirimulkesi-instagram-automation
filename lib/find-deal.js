const { execFileSync, spawnSync } = require('child_process');
const path = require('path');

// Windows: Node'un shell:true modu cmd.exe metakarakterlerini (örn. URL'deki "&")
// güvenli şekilde kaçırmıyor, bu yüzden .cmd shim yerine node.exe + gerçek giriş
// dosyası doğrudan çağrılıyor (hiç shell kullanmadan).
function resolveFirecrawlCommand() {
  if (process.platform !== 'win32') {
    return { cmd: 'firecrawl', prefixArgs: [] };
  }
  const whereOut = execFileSync('where', ['firecrawl'], { encoding: 'utf8', shell: false });
  const cmdPath = whereOut
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.toLowerCase().endsWith('.cmd'));
  if (!cmdPath) throw new Error('firecrawl.cmd bulunamadı (where firecrawl):\n' + whereOut);
  const entryJs = path.join(path.dirname(cmdPath), 'node_modules', 'firecrawl-cli', 'dist', 'index.js');
  return { cmd: 'node', prefixArgs: [entryJs] };
}

const FIRECRAWL_CMD = resolveFirecrawlCommand();

const CATEGORY_QUERIES = [
  'erkek çorap',
  'kadın çorap',
  'tişört',
  'spor ayakkabı',
  'kazak',
  'çanta',
  'ceket',
];

function runFirecrawl(args, opts = {}) {
  // firecrawl CLI, durum/ilerleme metinlerini (ör. "Scrape ID: ...") stdout yerine
  // stderr'e yazıyor; bu yüzden ikisini birleştirip birlikte parse ediyoruz.
  const res = spawnSync(FIRECRAWL_CMD.cmd, [...FIRECRAWL_CMD.prefixArgs, ...args], {
    encoding: 'utf8',
    timeout: 120000,
    shell: false,
    ...opts,
  });
  if (res.error) throw res.error;
  const combined = `${res.stdout || ''}${res.stderr || ''}`;
  if (res.status !== 0) {
    throw new Error(`firecrawl komutu ${res.status} koduyla başarısız oldu:\n${combined}`);
  }
  return combined;
}

function extractJsonArray(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Firecrawl çıktısında JSON dizisi bulunamadı:\n' + text);
  }
  return JSON.parse(text.slice(start, end + 1));
}

function pickCategory() {
  return CATEGORY_QUERIES[Math.floor(Math.random() * CATEGORY_QUERIES.length)];
}

async function findDiscountedProducts({ tmpFile }) {
  const query = pickCategory();
  const searchUrl = `https://www.trendyol.com/sr?q=${encodeURIComponent(query)}&sst=BEST_SELLER`;

  const scrapeOut = runFirecrawl(['scrape', searchUrl, '-o', tmpFile]);
  const scrapeIdMatch = scrapeOut.match(/Scrape ID:\s*(\S+)/);
  if (!scrapeIdMatch) throw new Error('Scrape ID bulunamadı:\n' + scrapeOut);
  const scrapeId = scrapeIdMatch[1];

  runFirecrawl([
    'interact',
    `Click on 'Türkiye' to select the country, then navigate to ${searchUrl} and wait for products to load`,
    '-s',
    scrapeId,
  ]);

  const extractPrompt =
    'Look at the search results and find products that have a visible discount ' +
    '(a crossed-out original price AND a lower current price, or a discount percentage badge). ' +
    'Return ONLY a raw JSON array (no prose, no markdown fences) of up to 8 such products. ' +
    'Each object must have exactly these string fields: ' +
    '"name" (product name), "seller" (seller/brand name), "priceNow" (current price as shown, e.g. "279,99 TL"), ' +
    '"priceWas" (original crossed-out price as shown), "discountText" (discount badge text if shown, else compute like "%X İndirim"), ' +
    '"imageUrl" (full resolution main product image URL), "productUrl" (product page URL).';

  const extractOut = runFirecrawl(['interact', extractPrompt, '-s', scrapeId]);
  const products = extractJsonArray(extractOut);

  return { query, products };
}

module.exports = { findDiscountedProducts, CATEGORY_QUERIES };
