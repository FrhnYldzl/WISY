# Wisy · kişisel merkez

**Wisy**, okunan ve öğrenilen her şeyi kartlara çevirir, kavram evreninde bağlar, kimliklere ve yeteneklere atar,
öğrenmeyi projelere, projeleri kalıcı varlıklara dönüştürür. 12 öğrenme ajanı bu zinciri Claude ile işler.

```
Kavramlar → Kimlikler → Yetenekler → Öğrenme → Projeler → Varlıklar
```

Wisy bağımsız bir üründür: kendi deposu (`FrhnYldzl/WISY`, özel), kendi Railway projesi ve kendi Claude anahtarı.
Şirket tarafıyla ilişkisi yalnız kavramsaldır (panelde **Köprü**): veri, anahtar ve dağıtım paylaşılmaz.

## Yerelde çalıştırma

Gereken: Node 22.13+ (Python yalnız doğrulayıcı için).

```bash
npm install
```

```bash
npm start
```

→ http://localhost:8788. Stüdyo için `.env` içine `WISY_ANTHROPIC_API_KEY` (bkz. `.env.example`).
`public/index.html` sunucusuz da açılır; o zaman panel **Örnek** veriyle çalışır.

```bash
npm test
```

```bash
npm run validate
```

## Railway'e dağıtım

1. Railway'de **yeni proje** → GitHub'dan `FrhnYldzl/WISY`. `railway.json` okunur (`npm start`, sağlık `/api/health`).
2. Servise **Volume** ekle, mount path `/data`.
3. Variables:

| Değişken | Değer |
|---|---|
| `NODE_ENV` | `production` |
| `WISY_ANTHROPIC_API_KEY` | Wisy'ye ait anahtar |
| `WISY_PASSWORD_HASH` | `npm run sifre -- "<parola>"` çıktısı |
| `WISY_SESSION_SECRET` | uzun rastgele metin |
| `WISY_VAULT` | `/data/vault` |
| `WISY_DATA` | `/data/wisy.db` |

Parola tanımlı değilse sunucu `production`'da başlamaz. İlk açılışta `/data/vault` boşsa depodaki `vault/` tohum olarak kopyalanır;
sonrasında kasa yalnız Volume'de yaşar, yeniden dağıtım kayıtları ezmez.

## Yapı

| Yol | Ne |
|---|---|
| `public/` | Panel: Claude Design omurga v1 (`design/claude-design-cikti`) + Wisy Stüdyo. `ornek.js` örnek veri, `app.js` görünümler, `studio.js` stüdyo |
| `server/src/` | Tek servis (Fastify): `vault.ts` kasa okuma/yazma · `rules.ts` kural motoru · `model.ts` kasa → panel · `apply.ts` öneri uygulama · `agents.ts` ajan orkestratörü · `auth.ts` giriş · `store.ts` SQLite durum |
| `vault/` | Obsidian kasası — kaynak gerçeklik (dağıtımda tohum) |
| `.claude/agents`, `.claude/commands` | 12 ajan ve 4 akış. Claude Code ile panel aynı tanımları okur |
| `docs/`, `schema/`, `scripts/` | Spesifikasyon, şema, Python doğrulayıcı |
| `design/` | Claude Design paketi, eskizler, onaylı omurga çıktısı |

## Nasıl çalışır

- **Panel kasayı okur.** Model her istekte `vault/` altındaki Markdown + YAML frontmatter'dan kurulur.
- **Yazım tek kapıdan.** Hızlı kart, kimlik atama, durum değişikliği ve kabul edilen ajan önerileri `/api/vault/apply` ile yazılır.
  Her yazımdan sonra kural motoru çalışır; yeni hata doğarsa yazım geri alınır. Silme yok; yayın yok.
- **Ajanlar öneri verir.** Stüdyoda seçilen ajan, `.claude/agents/<ajan>.md` + `CLAUDE.md` kuralları + kasa bağlamıyla çalışır;
  değişiklikleri `wisy-oneri` bloğunda önerir, panel bunları kabul / reddet kutularında gösterir.
- **Akışlar çok adımlı.** `.claude/commands` içindeki komutların ajan sırası çıkarılır; son adım öneri bloğunu verir.
