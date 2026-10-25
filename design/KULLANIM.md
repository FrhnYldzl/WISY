# Wisy'yi Claude Design'da tasarlama kılavuzu

Bu paket Wisy panelinin ekranlarını Claude Design'da tasarlaman için hazırlandı. Claude Design, Claude içinde tasarımları canlı çalışma yüzeyinde (artboard) üreten tasarım ortamıdır. Tasarım sistemi kurabilir, ekranları masaüstü ve telefon için yan yana gösterebilir, sen yorum yaptıkça revize eder.

## Paketin içeriği

| Dosya | Ne işe yarar |
|-------|--------------|
| `01-tasarim-brifi.md` | Ürün, kullanıcı, problem, ton, uzak durulacaklar |
| `02-bilgi-mimarisi.md` | Gezinme, küresel öğeler, nesneler, alanlar, durumlar |
| `03-ekranlar.md` | 12 ekran: öncelik sırası, içerik ve durumlar |
| `04-tasarim-dili.md` | Renk belirteçleri (açık/koyu), yazı, biçim, bileşenler |
| `05-promptlar.md` | Tur tur yapıştırılacak hazır promptlar |
| `veri/ornek-veri.json` | 19 kimlik, iki proje, kanallar, örnek kart ve metrikler |
| `referans/wisy-ekosistem.html` | Onaylanan ekosistem haritası (renk ve dil kaynağı) |
| `referans/eskizler/` | Defterdeki 5 el çizimi |

## Adım adım

### 1. Yeni bir sohbet aç
Claude'da yeni bir sohbet başlat ve "Wisy için Claude Design'da bir tasarım yapacağız" de. Claude tasarım ortamını açar. İstersen önce "Wisy tasarım sistemi" adıyla ayrı bir tasarım sistemi kurdurup ekranları onun üzerine yaptırabilirsin; bu, sonraki her ekranın aynı dili konuşmasını sağlar.

### 2. Dosyaları ekle
Zip'i bilgisayarında aç. Sohbete şunları sürükle:
- Beş Markdown dosyası (`01` → `05`)
- `veri/ornek-veri.json`
- `referans/wisy-ekosistem.html`
- `referans/eskizler/` içindeki 5 görsel

Zip'in tamamını eklemek yerine dosyaları tek tek eklemek, Claude'un her birini doğrudan görmesini sağlar.

### 3. Tur 0 ile başla
`05-promptlar.md` içindeki Tur 0 promptunu yapıştır. Claude önce anladığını özetler ve soru sorar. Bu turu atlama: yanlış anlaşılan bir ana fikir, tüm ekranlara yayılır.

### 4. Turları sırayla yürüt
Tur 1 (tasarım sistemi) → Tur 2 (pano) → Tur 3 (kart yakalama ve kartlar) → Tur 4 (kimlikler) → Tur 5 (hikaye kartı) → Tur 6 (yetenekler) → Tur 7 (öncelik 2) → Tur 8 (devir).

Her turdan sonra:
- Beğenmediğin yeri somut söyle ("halka zinciri telefonda taşıyor", "kimlik rozetleri birbirine çok benziyor").
- Yorumu doğrudan tasarımın üzerindeki öğeye bırakabilirsin.
- Bir ekranı onaylamadan sonrakine geçme.

### 5. Değerlendirme listesi
Her ekranı şu sorularla kontrol et:
- Ana hikaye hissediliyor mu?
- Kimlik ve kişisel/şirket ayrımı her kayıtta görünüyor mu?
- Boş halka, bekleme süresi dolan kart ve kimliksiz kayıt bir bakışta fark ediliyor mu?
- Telefonda tek elle kart yakalanabiliyor mu?
- Koyu tema da aynı özenle yapılmış mı?
- Gereksiz süs var mı? (Holiday ilkesi: az ama kalıcı.)

### 6. Dışa aktar ve Claude Code'a devret
Onayladığın tasarımları dışa aktar (PDF veya görsel) ve tasarım bağlantısını sakla. Tur 8'deki devir notuyla birlikte, Claude Code projesinde `design/` klasörüne koy. Claude Code paketindeki Faz 6, paneli bu klasördeki tasarımlara göre kurar.

## İpuçları

- Tek seferde 12 ekran isteme. Öncelik 1'deki 6 ekran, sistemin doğruluğunu test etmek için yeterli.
- Örnek verideki sayılar tasarım içindir; Claude'a "gerçek veri değil, örnek olarak işaretle" diyebilirsin.
- Renklerde değişiklik istersen önce tasarım sisteminde yaptır, sonra ekranlara yansıt.
- Kimlik listesi değişirse `veri/ornek-veri.json` içindeki `kimlikler` dizisini güncelle ve yeniden ekle.
