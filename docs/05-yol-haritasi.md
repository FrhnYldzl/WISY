# 05 — Yol haritası

Her faz bir öncekinin üzerine kurulur. Faza başlamadan önce plan sunulur ve onay alınır. Kabul kriterleri karşılanmadan sonraki faza geçilmez.

## Faz 0 — Kurulum

- Kasanın konumuna karar ver (Obsidian Master içinde `BILGE/Wisy` veya ayrı kasa).
- `vault-template/` içeriğini hedef konuma kopyala.
- Obsidian'da Dataview eklentisini etkinleştir.
- Başlangıç kimliklerini ve yeteneklerini gözden geçir: ekle, birleştir, çıkar.

**Kabul**: Doğrulayıcı 0 hata. Panolar açılıyor ve kimlik listesi görünüyor.

## Faz 1 — Edinim

- `kutuphaneci`: Drive, masaüstü ve eski diskteki kaynakların envanteri (yalnızca liste, taşıma yok). Fiziksel kitaplar için ISBN listesinden `kaynak` notu.
- `/kart` komutu: işaretten kart oluşturma, bekleme tarihi atama.
- `bultenci`: bekleme süresi dolan kartları gösteren haftalık liste ve bülten taslağı.

**Kabul**: 3 kaynak, 15 kart, 1 haftalık bülten taslağı. Her kartta tema ve birincil kimlik.

## Faz 2 — Kavram evreni, kimlik ve yetenek

- `haritaci`: kartları kavramlara bağlar, eksen etiketlerini doldurur.
- `kimlik-yonlendirici`: kimliksiz kayıtları tarar.
- `yetenek-olcer`: her kimliğin yeteneklerinde evre ve hedef evre.
- Panolar: kavram yoğunluğu, kimlik dağılımı, yetenek açıkları.

**Kabul**: Her kart bir kavrama bağlı. Kimliksiz kayıt yok. Yetenek açıkları panosu dolu.

## Faz 3 — Öğrenme ve proje

- `hoca`: en büyük üç yetenek açığı için müfredat ve modüller.
- `proje-mimari`: proje üretici matrisi ve sinerji kesişimlerinden hikaye kartı taslakları.
- `/hikaye-karti` komutu.

**Kabul**: 3 modül planlı, 2 proje hikaye kartı tam ve `aktif`.

## Faz 4 — Çıktı ve dağıtım

- `editor`: koleksiyondan içerik derleme, çıktı merdiveni, uyum kontrolü.
- `yayin-planlayici`: kanal takvimi, geri bildirimi kavram evrenine yazma.

**Kabul**: 4 haftalık takvim, 1 bülten ve 4 günün kartı onaylı. Avukat ve yatırımcı kimlikli içeriklerde uyum alanları dolu.

## Faz 5 — Varlık, vitrin ve sicil

- `portfoy-yoneticisi`: varlık kaydı ve katkı alanları.
- `depo-sorumlusu`: GitHub, Hugging Face, Kaggle, Zenodo için yayın listesi (yayın onayla).
- `sicil-tutucu`: diploma, lisans, sertifika, yayın kayıtları; doçentlik kategorileri (güncel kriterler araştırılarak).

**Kabul**: Varlık portföyü panosu dolu. Meridyen için varlık kaydı ve vitrin planı. Sicilde yenileme takvimi.

## Faz 6 — Wisy paneli ve Vibe Management köprüsü

- Claude Design'da onaylanan ekranlara göre yerel web paneli (kasayı okur ve kasaya yazar).
- `taraf: sirket` veya `aktarim` işaretli modüllerin Vibe Management'a dışa aktarımı.

**Kabul**: Panel ana hikayeyi, kimlikleri, yetenek açıklarını, projeleri ve varlıkları gösteriyor. Dışa aktarım yalnızca işaretli kayıtları içeriyor.
