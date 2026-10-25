# Wisy Merkez · Omurga v1

Ferhan'ın kişisel Vibe Management paneli. MTFG Ana Merkez ailesinden: aynı kabuk, aynı palet, aynı yazı sistemi; tek fark vurgu rengi.

Kaynak artifact: https://claude.ai/artifact/5gjKjtdxkWon2XDAavmgTM

## Çalıştırma

`public/index.html` dosyasını tarayıcıda açın. Tek dosyadır (CSS + HTML + JS); dış kaynak yalnızca Google Fonts. Sunucu gerekmez.

## Dosya yapısı

```
public/
  index.html   Kabuk + 12 görünüm (tek dosya)
```

## index.html içindeki bloklar

| Blok | İçerik |
|---|---|
| `:root` tokenları | MTFG ortak tokenları birebir (lacivert #0A2240, kâğıt #FAFAF7, Playfair Display + Inter + JetBrains Mono). Wisy farkı: `--wisy` #0E6B68 (koyu tema #4FB7AA). Kırmızı yalnızca "dikkat" anlamında. |
| Anlam eşlemesi | `--core` (çekirdek halkalar) = Wisy yeşili, `--asset` (varlık) = lacivert, `--agent` (ajan önerisi) = bilgi mavisi, `--attn` (boş halka, bekleme doldu) = kırmızı, `--fam-*` kimlik aileleri |
| `IDS`, `FAM` | 19 kimlik, 5 aile (ornek-veri.json) |
| `CARDS` | Örnek kartlar (taslak / beklemede / hazır / kullanıldı) |
| `SK`, `MODS`, `PROJ`, `ASSETS`, `SICIL`, `CONTENT`, `CHANNELS`, `CONCEPTS` | Yetenek, modül, proje (altı halka), varlık, sicil, içerik, kanal, kavram örnek verisi |
| `V.*` | Görünümler: pano, kartlar, evren, kimlikler, yetenekler, ogrenme, projeler, varliklar, yayin, kopru, muhasebe, omurga |
| `phead()` | Sayfa başlığı şablonu (etiket + durum + Playfair başlık + açıklama + eylemler) |
| `chain()` | Altı halka zinciri (Wisy imzası) |
| `captureHTML()`, `suggest()` | Hızlı kart çekmecesi ve anahtar kelimeye dayalı örnek ajan önerisi |

## Durum

| Panel | Durum |
|---|---|
| Tasarım omurgası, Pano, Kartlar + hızlı kart | Omurga v1 |
| Kimlikler, Projeler, Yetenekler, Öğrenme, Varlıklar, Yayın, Kavram evreni, Köprü, Kimlik muhasebesi | İskelet · detaylandırılacak |

Detaylandırma sırası "Tasarım omurgası" ekranındaki tabloda.

## Notlar

- Tüm sayılar örnek veridir.
- Hızlı kartla eklenen kartlar yalnızca tarayıcının `localStorage`'ında tutulur (`wisy-cards`); tema tercihi `wisy-theme`. Obsidian kasasına yazma henüz yok.
- Ajan önerileri Claude'a bağlı değil; basit anahtar kelime eşleştirmesi.
- Görünüm bağlantıları: `#pano`, `#kartlar`, `#kimlikler`, `#projeler`, `#omurga` vb.
