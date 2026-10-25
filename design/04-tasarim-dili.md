# 04 — Tasarım dili

Onaylanan ekosistem haritasından (`referans/wisy-ekosistem.html`) türetilmiştir. Başlangıç noktasıdır; Claude Design'da iyileştirilebilir.

## Renk

| Belirteç | Açık | Koyu | Kullanım |
|----------|------|------|----------|
| `bg` | #F5F7F8 | #0E151A | Sayfa zemini |
| `surface` | #FFFFFF | #152028 | Kart ve panel |
| `fg` | #13212B | #E3EAEE | Ana metin |
| `muted` | #55646E | #9AAAB4 | İkincil metin |
| `line` | #D5DDE2 | #2A3943 | Çizgi ve kenarlık |
| `core` | #0E6B68 | #5CC4B8 | Çekirdek: kavram, kimlik, yetenek, öğrenme |
| `core-soft` | #E2F1EF | #163631 | Çekirdek zemin |
| `asset` | #9A6A12 | #E1B261 | Varlık, çıktı, yayın |
| `asset-soft` | #F6EBD5 | #3A2D14 | Varlık zemin |
| `agent` | #4B4F9C | #A9ACF0 | Ajan önerileri |
| `agent-soft` | #E9E9F7 | #24264A | Ajan zemin |
| `in-soft` | #EDF1F3 | #1A262E | Girdi ve kaynak |

**Anlamsal renkler** (vurgu renginden ayrı): dikkat (bekleme doldu, eksik halka), uyarı (yenileme yaklaşıyor), tamam (halka dolu, onaylı). Claude Design bu üçünü palete uygun seçsin.

**Taraf**: kişisel ve şirket rozetleri renk + simge/şekil ile ayrılmalı, yalnızca renge dayanmamalı.

**Kimlik aileleri**: beş aile için beş ton gerekiyorsa çekirdek rengin türevleriyle sınırlı tut; rozet metni her zaman okunur kalsın.

## Yazı

| Rol | Yazı tipi | Not |
|-----|-----------|-----|
| Başlık | Bricolage Grotesque 500/700 | Az ve ölçülü |
| Gövde | Source Sans 3 400/600 | 16px, satır aralığı 1.55 |
| Etiket ve veri | JetBrains Mono 400/500 | 11–12px, büyük harf etiketlerde hafif harf aralığı |

Ölçek: 12 · 14 · 16 · 18 · 24 · 32 · 48.

## Biçim

- Köşe: kart 10px, rozet tam yuvarlak, düğme 8px.
- Gölge yok ya da çok hafif; ayrım kenarlık ve zemin tonuyla.
- Boşluk ölçeği: 4 · 8 · 12 · 16 · 24 · 32 · 48.
- Kart her şeye uygulanmaz; yalnızca tek başına bir nesneyi temsil eden öğelere.

## İmza öğeleri

- **Meridyen çizgileri**: başlık alanında ince dikey çizgi ızgarası (haritadaki boylamlar gibi). Marka imzası.
- **Altı halka zinciri**: ana hikaye ve hikaye kartı için tekrar eden bileşen.
- **Katman rayı**: solda katman numarası ve adı, sağda içerik (haritadaki yapı).

## Bileşenler

Kimlik rozeti · Taraf rozeti · Durum çipi · Evre göstergesi (3 adım) · Halka zinciri · Kart (fikir kartı) · Bekleme sayacı · Ajan önerisi kutusu (çivit zemin, kabul/reddet) · Uyum onay listesi · Kanal etiketi · Varlık satırı · Boş durum.

## Erişilebilirlik

- Metin kontrastı WCAG AA.
- Durum ve taraf yalnızca renkle değil, metin veya simgeyle de anlatılır.
- Klavye odağı görünür.
- Telefonda dokunma hedefi en az 44px.
