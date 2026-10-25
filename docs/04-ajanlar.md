# 04 — Ajanlar

Her ajan tek bir katmanın sahibidir. Tanımları `.claude/agents/` içindedir; Claude Code bunları alt ajan olarak tanır.
İnsan karar verir. Ajan hazırlar, sınıflar ve önerir; silme, yayınlama ve dışa aktarma onayla yapılır.

| Ajan | Katman | Girdi | Çıktı |
|------|--------|-------|-------|
| kutuphaneci | 0 | Drive/masaüstü klasörleri, ISBN listesi | `kaynak` notları, tekrar raporu |
| bultenci | 1 | İşaretler, hazır kartlar | Bekleme takvimi, haftalık bülten taslağı |
| haritaci | 2–3 | Kartlar | Kavram bağlantıları, eksen etiketleri, yeni kavram önerileri |
| kimlik-yonlendirici | 4 | Kimliksiz kayıtlar | Birincil kimlik önerisi veya soru |
| yetenek-olcer | 5 | Projeler, sicil | Evre güncellemesi önerisi, kanıt kaydı, açık raporu |
| hoca | 6 | Yetenek açıkları | Müfredat ve modül planı, quiz |
| proje-mimari | 6 | Proje üretici matrisi, kesişimler | Hikaye kartı taslağı |
| editor | 7 | Kart koleksiyonları | İçerik taslağı, merdiven basamağına göre biçim, uyum kontrolü |
| portfoy-yoneticisi | 7 | Projeler | Varlık kaydı, nakit akışı ve değerleme katkısı |
| yayin-planlayici | 8 | Onaylı içerik | Yayın takvimi, kanal geri bildirimi |
| depo-sorumlusu | 9 | Teknik varlıklar | Sürüm, lisans, README; vitrin yayın listesi |
| sicil-tutucu | 10 | Belgeler | Sicil kaydı, yenileme takvimi, doçentlik dosyası |

## Orkestrasyon

v1'de ana Claude Code oturumu orkestratördür. Komutlar (`/kart`, `/haftalik-bulten`, `/hikaye-karti`, `/kimlik-muhasebesi`) ilgili ajanları sırayla çağırır.

Önerilen ritim:
- **Günlük**: `/kart` (oku ve kart çıkar)
- **Haftalık**: `/haftalik-bulten`
- **Aylık**: içerik serisi ve proje adımı
- **Çeyreklik**: `/kimlik-muhasebesi`

## Ajan yazım kuralları

- Her ajan önce `CLAUDE.md` ve kendi katmanının belgesini okur.
- Kasaya yazmadan önce ne yazacağını listeler.
- Kimlik veya taraf belirsizse varsaymaz, sorar.
- Her yazımdan sonra doğrulayıcıyı çalıştırır.
