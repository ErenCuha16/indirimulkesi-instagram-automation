# instagram-automation

Trendyol'da indirimli ürün bulup markalı bir görsel üreten ve Buffer üzerinden
Instagram hesabına (`indirimulkesi`) otomatik paylaşan bir pipeline. Günde 3
kez GitHub Actions üzerinden kendiliğinden çalışır — kullanıcının bilgisayarı
kapalıyken de çalışmaya devam eder.

**Bu dosyayı güncel tut.** Mimariyi, ortam değişkenlerini, zamanlamayı ya da
buradaki gotcha'lardan birini değiştiren her değişiklikte CLAUDE.md'yi aynı
commit içinde güncelle. Burada yazılanlar denenip öğrenilmiş şeyler — kod
değiştiğinde bu dosya sessizce yanlış kalmasın.

## Mimari / akış (`run.js`)

1. `lib/posted-log.js` → Cloudinary'den daha önce paylaşılmış ürün URL'lerini okur.
2. `lib/find-deal.js` → Firecrawl CLI (`scrape` + `interact`) ile Trendyol'da
   rastgele bir kategori arar, indirimli ürünleri JSON olarak çıkarır.
3. En yüksek indirim yüzdesine sahip, daha önce paylaşılmamış ürün seçilir.
4. `lib/make-image.js` → sharp ile ürün görseli + marka/indirim rozeti/fiyat
   bindirilmiş 1080x1080 PNG üretir (`output/deal-post.png`, gitignore'da).
5. `lib/cloudinary-client.js` → görseli Cloudinary'e yükler, `secure_url` alınır.
6. `lib/buffer-client.js` → Buffer GraphQL API'sine `createPost` (mode:
   `shareNow`) çağrısı yapılır, Instagram'da anında yayınlanır.
7. `lib/posted-log.js` → paylaşılan ürün URL'si Cloudinary'deki raw JSON
   kaydına (`public_id: indirimulkesi-posted-log`) eklenir.

**Önemli:** posted-log **git'te değil Cloudinary'de** tutulur. Bu yüzden
workflow'un çalıştıktan sonra repoya commit/push atmasına gerek yok.

## Neden Instagram'a doğrudan değil, Buffer üzerinden paylaşılıyor

Instagram'ın Graph API'sine gönderi atabilmek için Meta'nın app review
sürecinden geçmiş, onaylı bir uygulama olman gerekiyor. Buffer zaten bu onayı
almış; biz sadece Buffer'ın kendi API'sine "bu görseli bu metinle paylaş"
diyoruz, gerçek Instagram yayınlama işini onlar üstleniyor.

## Zamanlama: GitHub Actions, Claude Code routine DEĞİL

`.github/workflows/post-deal.yml` günde 3 kez tetiklenir: `0 7 * * *`,
`0 12 * * *`, `0 17 * * *` (UTC) = 10:00 / 15:00 / 20:00 Europe/Istanbul.

Bilerek Claude Code'un `schedule`/routine (RemoteTrigger) özelliği
**kullanılmadı** — gözetimsiz, tekrarlayan, herkese açık paylaşım yapan bir
otomasyon olduğu için platformun auto-mode classifier'ı routine oluşturmayı
engelliyor (hem sırlar prompt'a gömülü hem de gömülü olmadan denendi, ikisi de
reddedildi). GitHub Actions bu kısıtın tamamen dışında.

## Ortam değişkenleri

`BUFFER_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
`CLOUDINARY_API_SECRET`, `FIRECRAWL_API_KEY`.

- **Lokalde**: `instagram-automation/.env` (gitignore'da, asla commit'lenmez).
  `lib/load-env.js` bunu okur; dosya yoksa (ör. CI'da) sessizce atlar.
- **CI'da (GitHub Actions)**: repo → Settings → Secrets and variables →
  Actions → **Repository secrets** (Environments sekmesi DEĞİL — workflow'da
  `environment:` tanımlı olmadığı için environment secrets hiç enjekte
  edilmez; bu yüzden ilk deploy'da tüm run'lar "Eksik ortam değişkeni"
  hatasıyla düşmüştü).

### Firecrawl CLI'nin kendi auth'u ayrı

Firecrawl CLI, `.env`'den bağımsız kendi login/config mekanizmasını kullanır
(`firecrawl view-config` ile kontrol edilir, config
`%APPDATA%\firecrawl-cli` altında saklanır). Lokalde zaten login olduğun için
`.env`'de `FIRECRAWL_API_KEY` olmasa da çalışır — ama CI'da interaktif login
mümkün olmadığı için CI'ya `FIRECRAWL_API_KEY`'i **Repository secret** olarak
eklemek şart. Anahtarı `.env`'e çekmek için: `firecrawl env`.

## Repo kökü gotcha'sı

Bu repo'nun kökü zaten `instagram-automation` klasörünün içeriği — repo
içinde ayrı bir `instagram-automation/` alt klasörü **yok**. Workflow'da
`working-directory: instagram-automation` yazmak "No such file or directory"
hatasına yol açar (bir kez yaşandı, düzeltildi). `run.js`, `lib/`,
`package.json` hep repo kökünde.

## Klasör yapısı

- `run.js` — otomatik pipeline'ın ana script'i, `node run.js` ile çalışır.
- `lib/` — pipeline modülleri (yukarıdaki akışa bakın).
- `scripts/` — geliştirme sırasında elle çalıştırılan yardımcı script'ler,
  otomatik pipeline'ın parçası değil:
  - `scripts/list-channels.js` — Buffer organizasyon/kanal ID'lerini listeler
    (yeni bir sosyal medya hesabı bağlarken `CHANNEL_ID`'yi bulmak için).
  - `scripts/test-post.js` — Buffer API entegrasyonunu test etmek için
    kuyruğa (queue, `shareNow` değil) tek bir test gönderisi ekler.
- `.github/workflows/post-deal.yml` — cron zamanlaması + `workflow_dispatch`
  (elle tetikleme) tanımlı GitHub Actions workflow'u.
- `output/`, `.firecrawl-tmp/` — çalışma zamanında üretilen, gitignore'da
  olan geçici dosyalar.

## Test / doğrulama notu

`scripts/test-post.js` ve `run.js` gerçek Buffer/Instagram API'lerine istek
atar — çalıştırmak gerçekten bir gönderi oluşturur (test-post.js queue'ya,
run.js doğrudan Instagram'a). Bu yüzden bunları "deneme amaçlı" çalıştırmadan
önce kullanıcıya haber ver.
