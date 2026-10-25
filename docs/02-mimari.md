# 02 — Mimari

Wisy on bir katmandan oluşur. Her katmanın bir sahibi ajan vardır. Akış yukarıdan aşağıya, geri besleme aşağıdan yukarıya işler.

| # | Katman | Ne yapar | Sahip ajan | Kasa klasörü |
|---|--------|----------|------------|--------------|
| 0 | Kaynaklar ve veri | Fiziksel ve dijital kütüphane, dış veri, kurslar, bültenler | Kütüphaneci | `10-kaynaklar` |
| 1 | Alım ve dijital kartlar | Kalemle okuma, bekleme, tek fikir tek kart, bülten | Bültenci | `00-gelen`, `20-kartlar` |
| 2 | Dört harita | Bilim alanları, üniversiteler, şirketler, varlıklar | Haritacı | `30-kavramlar/haritalar` |
| 3 | Kavram evreni | Disiplin × fonksiyon × sektör eksenlerinde kavram ağı | Haritacı | `30-kavramlar` |
| 4 | Kimlik filtresi | Her kayda birincil kimlik atar | Kimlik yönlendirici | `40-kimlikler` |
| 5 | Yetenekler | Kimlik başına yetenek seti, evre, kanıt, açık | Yetenek ölçer | `50-yetenekler` |
| 6 | Kişisel üniversite | Müfredat → modül → proje | Hoca, Proje mimarı | `60-ogrenme`, `70-projeler` |
| 7 | Çıktılar | Medya ve materyaller; varlık portföyü | Editör, Portföy yöneticisi | `80-varliklar`, `90-icerik` |
| 8 | Medya dağıtımı | LinkedIn, bülten, web, akademik, video ve ses | Yayın planlayıcı | `90-icerik/takvim` |
| 9 | Teknik vitrin | GitHub, Hugging Face, Kaggle, Zenodo | Depo sorumlusu | `80-varliklar/vitrin` |
| 10 | Eğitim ve yetkinlik | Kurslar (Udemy, Borfin, MasterClass), SPL ve sertifikalar, doçentlik dosyası | Sicil tutucu | `85-sicil` |

## Dört harita

- **Bilim alanları**: sosyal ↔ fen yelpazesi, üniversite bölümleri; ilgi, etki ve bilim filtreleri; 80/20 önceliklendirme.
- **Üniversiteler**: doktora, yüksek lisans, sertifikalar; "live" (güncel programlar) ve "skillset" (kazanılan yetkinlik).
- **Şirketler**: fonksiyonlar (finans: bütçe, nakit akımı, bilanço; pazarlama; marka; satış; operasyon), endüstri ve sektör, e-ticaret, e-ihracat, halka açık şirketler.
- **Varlıklar**: kişisel ve şirket; dönen (OPEX), duran (CAPEX: maddi, finansal, gayri maddi) ve entelektüel.

## Kimlik filtresi

Kimlikler dört aile ve bir kök aileden oluşur. Her biri bir yaşam dikeyine bağlıdır (BİLGE, VARLIKLI, SAĞLIKLI, MUTLU, SEVGİLİ). Tam liste: `vault-template/40-kimlikler`.

Kimliklerin zaman ekseni:
- **Kök (geçmiş)**: birikim bırakanlar.
- **Güncel (aktif)**: birikimi kullananlar.
- **Hedef (gelecek)**: öğrenme yoluna yön verenler.

## Geri besleme

İki yönlüdür:
1. İçerik ve kanal verisi (etkileşim, yorum) kavram evrenine yazılır.
2. Teknik vitrin ve kurslardan gelen geri bildirim (issue, yorum, öğrenci sorusu, yarışma sonucu) kişisel üniversitenin modüllerine döner.

## Wisy ve Vibe Management

Aynı zincir iki tarafta paralel işler.

| Halka | Wisy (kişi) | Vibe Management (şirket) |
|-------|-------------|--------------------------|
| Kavram | Kişisel kavram evreni | Sektör ve iş kavramları |
| Kategori | Kimlikler ve dikeyler | Sektör, fonksiyon, iş kolu |
| Yetenek | Kişisel yetenekler | Kurumsal yetkinlikler |
| Öğrenme | Kişisel üniversite | Ekip eğitimi |
| Proje | Kişisel projeler | Şirket projeleri |
| Varlık | Kişisel bilanço, entelektüel varlıklar | Şirket bilançosu, portföy |
| Marka | Kişisel marka | Şirket markası |

Köprü kuralları:
- Kişiden şirkete yetenek, itibar ve ağ geçer; şirketten kişiye deneyim ve anonimleştirilmiş vaka.
- Gizli bilgi geçmez. Rekabet yasağı alanları korunur.
- Şirkete giden modül `taraf: sirket` kopyası olarak dışa aktarılır, kaynak kayıtta `aktarim` alanı tutulur.

## Teknik yığın

**v1 (Faz 0–5)**: Obsidian kasası + Dataview panoları + Claude Code alt ajanları + Python betikleri.
**v2 (Faz 6)**: Kasayı okuyan yerel web paneli (Claude Design'da tasarlanan ekranlar) ve Vibe Management'a dışa aktarım.

Kasa her zaman kaynak gerçekliktir. Panel yalnızca okur ve kasaya yazar; ayrı bir veritabanı gerçeklik kaynağı olmaz.
