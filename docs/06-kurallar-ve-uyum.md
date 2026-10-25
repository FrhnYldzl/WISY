# 06 — Kurallar ve uyum

Bu kurallar her ajanı ve her çıktıyı bağlar. Hukuki değerlendirme değil, sistemin çalışma kurallarıdır; şüpheli durumda Ferhan karar verir.

## Mesleki sınırlar

| Kimlik | Sınır | Sistemdeki karşılığı |
|--------|-------|----------------------|
| Avukat | TBB reklam yasağı (Avukatlık Kanunu m.55 ve Meslek Kuralları): bilgilendirici içerik, iş çağrısı yok, sır saklama | `uyum.tbb: true` olmadan onay/yayın yok |
| Yatırımcı | Kişiye özel yatırım tavsiyesi yetki gerektirir (SPK) | İçerik genel analizle sınırlı, `uyum.spk: true` |
| E-ihracatçı, girişimci | Yatırımcı sözleşmelerindeki rekabet yasakları | Yasaklı alanlarda ticari teklif yok, `uyum.rekabet: true` |
| Yönetim kurulu üyesi | Gizlilik, içeriden bilgi | Şirket bilgisi Wisy'ye girmez |
| Harbiyeli ve subay | Görev dönemine ait gizlilik yükümlülükleri | Yalnızca açık kaynak ve kişisel bakış |
| Akademisyen | Bilimsel etik, atıf | Alıntı kaynakla, intihal kontrolü |

## Kişisel ve şirket ayrımı

1. Her kayıt `taraf` taşır.
2. Kişisel emekle üretilen kişiseldir. Şirket kaynağıyla üretilen şirkete aittir.
3. Kişisel bir projenin şirkete giden modülü sözleşmeyle aktarılır ve `aktarim` alanında kaydedilir. Örnek: Meridyen.
4. Zaman, para ve dikkat bütçeleri iki taraf için ayrı izlenir.

## Telif ve alıntı

- Kartlar kendi cümlelerimle yazılır.
- Alıntı kısa tutulur, kaynak ve sayfa belirtilir.
- Kitap sayfası fotoğrafları kişisel arşivde kalır, yayımlanmaz.

## Veri ve gizlilik

- Müvekkil, şirket ve üçüncü kişilere ait kişisel veri Wisy'ye girmez (KVKK).
- Kasa özel kalır. Teknik vitrine yalnızca açıkça işaretlenen varlıklar çıkar.
- Ajanlar dosya silmez; gerekirse `_silinecek/` klasörüne taşır ve listeler.
