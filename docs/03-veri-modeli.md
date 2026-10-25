# 03 — Veri modeli

Her kayıt bir Markdown notudur. Yapı YAML frontmatter'da, düşünce gövdede durur. Makinenin okuduğu tanım `schema/entities.yaml` içindedir; bu belge insan için açıklamadır.

## Ortak alanlar

| Alan | Açıklama |
|------|----------|
| `type` | Not tipi: kaynak, kart, kavram, kimlik, yetenek, modul, proje, varlik, icerik, sicil |
| `taraf` | `kisisel`, `sirket` veya `ortak` |
| `birincil_taraf` | `taraf: ortak` ise zorunlu |
| `birincil_kimlik` | `[[kimlik-notu]]` bağlantısı |
| `ikincil_kimlik` | En fazla bir kimlik |
| `olusturma` | YYYY-MM-DD |

Bağlantılar her zaman `"[[not-adi]]"` biçiminde, tırnak içinde yazılır (YAML için).

## Tipler

### kaynak
Bir kitap, makale, kurs ya da veri kaynağı. Fiziksel kitapta `isbn` ve `konum` (ev/ofis rafı), dijitalde `yol` (Drive veya disk yolu) tutulur.
`kaynak_turu: deneyim | sohbet` kişisel deneyim ve sohbet notları içindir (panelin hızlı kartı bu türleri sunar); bekleme süresi yalnızca kitapta işler.

### kart
Tek fikir. Kendi cümlelerimle. Gövdede: fikir (1–3 cümle), bağlam, varsa kısa alıntı (kaynak ve sayfayla).
Önemli alanlar: `kaynak`, `sayfa`, `tema` (kavram notu), `birincil_kimlik`, `bekleme_bitis`, `durum`.

Durum akışı: `taslak` (işaret alındı) → `beklemede` (bekleme süresi işliyor) → `hazir` (karta dönüştü) → `kullanildi` (içerik veya projede kullanıldı).

### kavram
Kavram evreninin düğümü ve kartların toplandığı dijital koleksiyon. Üç eksen: `eksen_disiplin`, `eksen_fonksiyon`, `eksen_sektor`. Gövde, bağlı kartların Dataview listesini içerir.

### kimlik
`ad`, `aile` (kok, mesleki, kurucu, akademik, kisisel), `dikey`, `zaman` (kok, guncel, hedef), `ana_soru`, `kanal`, `sinir`, `baglam`.

### yetenek
`kimlik`, `evre`, `hedef_evre`, `kanitlar` (liste: proje, yayın, sertifika bağlantıları). Açık = hedef_evre − evre.

### modul
Kişisel üniversitenin birimi. `yetenekler`, `kavramlar`, `kaynaklar`, `cikti` (modülü kapatan proje veya içerik).

### proje
Hikaye kartının kendisi. Altı halka:

| Halka | Alan |
|-------|------|
| Kavram | `kavramlar` |
| Kimlik | `birincil_kimlik`, `ikincil_kimlik` |
| Yetenek | `yetenekler` |
| Öğrenme | `moduller` |
| Proje | notun kendisi |
| Varlık | `varliklar` |

Kural: `durum: aktif` veya `tamamlandi` olabilmesi için bu alanların hepsi dolu olmalı.
Ek alanlar: `fonksiyon` (finans, marka, satis, operasyon), `varlik_sinifi`, `aktarim` (şirkete aktarılan modüller).

### varlik
`varlik_sinifi` (donen, maddi, finansal, gayri_maddi, entelektuel), `taraf`, `nakit_akisi_katkisi`, `degerleme_katkisi` (dusuk/orta/yuksek), `vitrin` (github, huggingface, kaggle, zenodo bağlantıları), `lisans`, `kaynak_proje`.

### icerik
`kanal`, `basamak` (kart → gunun_karti → bulten → seri → kalici), `kartlar` (derlendiği kartlar), `yayin_tarihi`, `uyum` (tbb, spk, rekabet, alinti: true/false).

### sicil
Entelektüel varlık kaydı. `tur` (diploma, lisans, sertifika, kurs, yayin), `kanit` (belge veya bağlantı), `gecerlilik`, `yenileme`, `docentlik_kategorisi`.

## Proje üretici matrisi

Satır: varlık sınıfı. Sütun: kişisel / şirket. Her hücrede fonksiyon etiketli proje fikirleri. Proje mimarı ajanı bu matrisi `30-kavramlar/haritalar/proje-uretici.md` notundan okur.

## Adlandırma

- Dosya adı: küçük harf, ASCII, kısa çizgi. `proje-finansmani-riski.md`
- Kart: `YYYYMMDD-kisa-baslik.md`
- Kimlik ve yetenek: sabit ad (`avukat.md`, `sozlesme-tasarimi.md`)
