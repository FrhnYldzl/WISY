# Wisy — proje hafızası (Claude Code için)

Bu dosya her oturumda okunur. Kısa tut, değişen kararları buraya işle.

## Wisy nedir

Wisy, Ferhan'ın **kişisel Vibe Management** sistemidir. Şirketler için Vibe Management neyse, kişi için Wisy odur.
Okunan, biriktirilen ve öğrenilen her şeyi tek bir kavram evreninde toplar; ajanlarla işler; değer üreten projelere ve kalıcı varlıklara dönüştürür.

Wisy kişisel bir projedir. Bazı modülleri sözleşmeyle şirket tarafına (Vibe Management / MTFG) aktarılır. Örnek: Meridyen kişiseldir, seçili modülleri şirkete gider.

## Ana hikaye (her şey bu zincirin halkasıdır)

```
Kavramlar → Kimlikler → Yetenekler → Öğrenme → Projeler → Varlıklar
```

- **Kavram**: ham madde. Okunan, kartlanan fikir.
- **Kimlik**: kavramı anlamlı kılan rol. "Bu hangi kimliğim için?"
- **Yetenek**: kimliğin ölçülebilir hali. Her kimliğin 3–5 çekirdek yeteneği var.
- **Öğrenme**: yeteneği bir evre ileri taşıyan müfredat ve modül.
- **Proje**: büyüyen yeteneği değere çeviren çıktı.
- **Varlık**: kalıcı birikim (IP, yayın, kurs, unvan, itibar).

## Değişmez kurallar

1. **Birincil kimlik**: Her kart, modül, proje ve içerik tek bir `birincil_kimlik` taşır; en fazla bir `ikincil_kimlik`. Kimliği olmayan kayıt kavram evreninde kalır, öğrenme ve üretime girmez.
2. **Taraf**: Her kayıt `taraf: kisisel | sirket | ortak` taşır. `ortak` ise `birincil_taraf` zorunludur.
3. **Hikaye kartı**: Bir proje, altı halkanın hepsi dolmadan `durum: aktif` olamaz.
4. **Tek fikir, tek kart**: Kart bir fikir taşır, kendi cümlelerimle yazılır. Kartlar dijitaldir; fiziksel kutu yoktur.
5. **Bekleme**: Kitaptan alınan işaretler `bekleme_bitis` tarihinden önce karta dönüşmez (Greene yöntemi, 7–14 gün).
6. **Boş sayfadan yazılmaz**: İçerik ve projeler kart koleksiyonlarından derlenir.
7. **Uyum**: Avukat kimliğiyle üretilen içerik bilgilendirici kalır, iş çağrısı yapmaz (TBB reklam yasağı). Yatırımcı kimliği kişiye özel yatırım tavsiyesi vermez. Rekabet yasağı alanlarında ticari teklif yoktur. Gizli müvekkil ve şirket bilgisi Wisy'ye girmez.
8. **Veri sahibi Ferhan'dır**: Ajanlar hazırlar, sınıflar, önerir. Silme, yayınlama ve dışa aktarma onaysız yapılmaz.

## Depo düzeni

```
CLAUDE.md                 bu dosya
docs/                     spesifikasyon (önce bunları oku)
schema/entities.yaml      varlık tipleri ve zorunlu alanlar
vault/                    Obsidian kasası (kaynak gerçeklik; vault-template'ten başladı)
.claude/agents/           alt ajan tanımları (12 ajan) — panel de bunları okur
.claude/commands/         slash komutları — panelde "Akış" olarak çalışır
scripts/validate_vault.py kasa doğrulayıcı
reference/                onaylı ekosistem haritası (HTML)
design/                   Claude Design paketi ve onaylı omurga v1 çıktısı
server/src/               Wisy tek servis (Fastify, TypeScript)
public/                   panel + Wisy Stüdyo
```

## Teknik kararlar (v1)

- **Veri katmanı**: Obsidian kasası. Markdown + YAML frontmatter. Kaynak gerçeklik budur.
- **Konum**: Obsidian Master kasası içinde `BILGE/Wisy` klasörü ya da ayrı bir kasa. Karar Ferhan'da; ikisinde de klasör yapısı aynıdır.
- **Panolar**: Obsidian Dataview eklentisi (`vault-template/00-pano`).
- **Ham depo**: Drive, masaüstü, eski disk. Dosyalar yerinde kalır, kasa bağlantı tutar.
- **Kod**: Python 3.11+ (betikler), ileride panel için TypeScript. Bağımlılık eklemeden önce sor.
- **Dil**: Belgeler ve arayüz metni Türkçe; dosya ve alan adları ASCII (ç→c, ş→s, ğ→g, ı→i, ö→o, ü→u).

## Panel (Faz 6, v0.1 — 25.10.2026)

- **Bağımsızlık**: Wisy ayrı üründür. Depo `FrhnYldzl/WISY` (şimdilik açık; özel yapılacak — gerçek kasa verisi depoya girmez), ayrı Railway projesi, ayrı Claude anahtarı. Anahtar yalnız `WISY_MANAGEMENT`; genel `ANTHROPIC_API_KEY` okunmaz. Başka projeden değişken, kod ya da veri kopyalanmaz.
- **Yığın**: Fastify + node:sqlite + Anthropic SDK + zod + tsx. Yerelde port 8788, yalnız 127.0.0.1; Railway'de `PORT` ve 0.0.0.0.
- **Giriş**: `auth.ts`. `NODE_ENV=production` iken `WISY_PASSWORD_HASH` + `WISY_SESSION_SECRET` zorunlu. Dağıtımda kasa Volume'de (`/data/vault`), ilk açılışta depodaki `vault/` tohumdur.
- **Tasarım**: `design/claude-design-cikti/wisy-merkez-omurga-v1.html` omurgadır; token, kabuk ve bileşenler değiştirilmez. Yeni ekranlar (Stüdyo, Ajanlar) yalnız bu token'larla yazılır.
- **Yazım tek kapı**: `server/src/apply.ts`. Kural motoru (`rules.ts`) `validate_vault.py` ile aynı denetimleri yapar; yeni hata doğuran yazım geri alınır. Kimliksiz/temasız taslak kart geri alınmaz, panoda "dikkat" olarak görünür.
- **Ajan protokolü**: ajan yanıtı sonunda `wisy-oneri` bloğu (kart_olustur, kimlik_ata, alan_guncelle, kanit_ekle, not_olustur). Panel kabul edince yazılır. Ajan tanımı değişirse panel otomatik görür.
- **Uygulama durumu** (oturum, kütüphane, kullanım, kasa günlüğü) `var/wisy.db`; kasa verisi oraya girmez.

## Çalışma biçimi

- Her fazdan önce `docs/05-yol-haritasi.md` içindeki kabul kriterlerini oku, planı sun, onay al.
- Her değişiklikten sonra `python scripts/validate_vault.py vault` (ya da `npm run validate`) ve `npm test` çalıştır; 0 hata hedefi.
- Yeni varlık tipi veya alan eklerken önce `schema/entities.yaml` ve `docs/03-veri-modeli.md` güncellenir.
- Kişisel/şirket ayrımını bozan bir değişiklik önerme; emin değilsen sor.
