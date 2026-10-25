import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { deflateRawSync } from "node:zlib";
import { join } from "node:path";
import { test } from "node:test";
import { extractProposals, loadAgents, systemFor } from "./agents.ts";
import { buildApp, claudeError } from "./app.ts";
import { authFromEnv, hashPassword, verifyPassword } from "./auth.ts";
import { Writer } from "./apply.ts";
import { docxToText, toBlock, xlsxToText } from "./files.ts";
import { buildModel } from "./model.ts";
import { check, loadSchema } from "./rules.ts";
import { parseFrontmatter, replaceField, Vault } from "./vault.ts";

const ROOT = join(import.meta.dirname, "..", "..");
const OFF = { enabled: false, hash: "", secret: "", days: 14 };
const schema = loadSchema(join(ROOT, "schema", "entities.yaml"));
const tmpVault = () => { const d = mkdtempSync(join(tmpdir(), "wisy-")); cpSync(join(ROOT, "vault"), d, { recursive: true }); return new Vault(d); };

test("frontmatter: liste, harita, tırnak, boş", () => {
  const { fm } = parseFrontmatter(`---\ntype: proje\nbaslik: "A: b"\nliste:\n  - "[[x]]"\n  - "[[y]]"\nbos: []\nuyum:\n  tbb: false\n  alinti: true\nsayfa:\n---\n# T\n`);
  assert.deepEqual(fm, { type: "proje", baslik: "A: b", liste: ["[[x]]", "[[y]]"], bos: [], uyum: { tbb: false, alinti: true }, sayfa: null });
});

test("replaceField yalnız o alanı değiştirir", () => {
  const src = "---\ntype: kart\nkaynak: \"[[k]]\"\nmoduller:\n  - a\n  - b\ndurum: taslak\n---\n\n# X\n";
  const out = replaceField(src, "moduller", ["[[m]]"]);
  assert.equal(out, "---\ntype: kart\nkaynak: \"[[k]]\"\nmoduller:\n  - \"[[m]]\"\ndurum: taslak\n---\n\n# X\n");
  assert.match(replaceField(src, "yeni", "v"), /durum: taslak\nyeni: v\n---/);
});

test("kural motoru Python doğrulayıcıyla aynı: başlangıç kasası 0 hata, 1 uyarı", () => {
  const issues = check(new Vault(join(ROOT, "vault")).notes(), schema);
  assert.equal(issues.filter((i) => i.sev === "hata").length, 0, JSON.stringify(issues));
  assert.deepEqual(issues.filter((i) => i.sev === "uyari").map((i) => i.id), ["savunma-sanayii-hukuku"]);
});

test("model: 19 kimlik, altı halka, kimliksiz yok", () => {
  const v = new Vault(join(ROOT, "vault"));
  const m = buildModel(v.notes(), []);
  assert.equal(m.ids.length, 19);
  const sav = m.projects.find((p) => p.id === "savunma-sanayii-hukuku")!;
  assert.deepEqual(sav.rings.map((r) => r[2]), [1, 1, 1, 0, 1, 0]);
  assert.equal(m.projects.find((p) => p.id === "meridyen")!.rings.every((r) => r[2]), true);
  assert.equal(m.cards[0]!.kim, "danisman-ve-mentor");
  assert.ok(m.syn.length >= 3, "sinerji kesişimleri proje-uretici.md'den okunur");
});

test("öneri: kitaptan kart beklemede açılır, tema ve kaynak taslağı oluşur", () => {
  const v = tmpVault(); const w = new Writer(v, schema);
  const r = w.apply({ tur: "kart_olustur", baslik: "Belirsiz hüküm ihtilaf günü pahalıdır", fikir: "x", kaynak: "Sözleşme yazımı kitabı", kaynak_turu: "kitap", sayfa: "203", tema: "Sözleşme tasarımı", birincil_kimlik: "avukat", taraf: "kisisel" });
  assert.equal(r.yazilan.length, 3); // kaynak + kavram + kart
  const card = v.notes().find((n) => n.type === "kart" && n.title.startsWith("Belirsiz"))!;
  assert.equal(card.fm.durum, "beklemede");
  assert.equal(card.fm.birincil_kimlik, "[[avukat]]");
  assert.equal(check(v.notes(), schema).filter((i) => i.sev === "hata").length, 0);
});

test("öneri: yetenekle aynı adlı tema ayrı dosya adı alır (bağlantı çakışmaz)", () => {
  const v = tmpVault(); const w = new Writer(v, schema);
  w.apply({ tur: "kart_olustur", baslik: "Belirsiz hüküm pahalıdır", kaynak: "Sohbet", kaynak_turu: "sohbet", tema: "Sözleşme tasarımı", birincil_kimlik: "avukat", taraf: "kisisel" });
  const card = v.notes().find((n) => n.type === "kart" && n.title.startsWith("Belirsiz"))!;
  assert.equal(card.fm.tema, "[[sozlesme-tasarimi-2]]");
  const issues = check(v.notes(), schema);
  assert.equal(issues.filter((i) => i.kural === "cift-ad").length, 0);
});

test("öneri: kural ihlali geri alınır (hikaye kartı eksik proje aktif olamaz)", () => {
  const v = tmpVault(); const w = new Writer(v, schema);
  const before = readFileSync(join(v.root, "70-projeler", "savunma-sanayii-hukuku.md"), "utf-8");
  assert.throws(() => w.apply({ tur: "alan_guncelle", hedef: "savunma-sanayii-hukuku", alan: "durum", deger: "aktif" }), /Kural ihlali/);
  assert.equal(readFileSync(join(v.root, "70-projeler", "savunma-sanayii-hukuku.md"), "utf-8"), before);
  assert.throws(() => w.apply({ tur: "alan_guncelle", hedef: "avukat", alan: "ad", deger: "x" }), /değiştirilemez/);
});

test("ajanlar .claude/agents'tan, akışlar .claude/commands'tan okunur", () => {
  const { agents, flows } = loadAgents(ROOT);
  assert.equal(agents.length, 13); // 12 ajan + orkestratör
  assert.deepEqual(flows.find((f) => f.id === "kart")!.adimlar, ["bultenci", "haritaci", "kimlik-yonlendirici"]);
});

test("öneri bloğu ayıklanır, geçersiz olan ayrılır", () => {
  const r = extractProposals('Metin\n```wisy-oneri\n[{"tur":"kimlik_ata","hedef":"a","birincil_kimlik":"avukat"},{"tur":"sil","hedef":"a"}]\n```');
  assert.equal(r.proposals.length, 1); assert.equal(r.invalid.length, 1);
});

test("API: ajan akışı SSE ile döner, öneri bloğu ayrıştırılır (sahte Claude)", async () => {
  const v = tmpVault();
  let seen: { system?: string; model?: string } = {};
  const reply = 'Yönlendirme: Kimlik yönlendirici.\n```wisy-oneri\n[{"tur":"kimlik_ata","hedef":"x","birincil_kimlik":"avukat","gerekce":"hukuk"}]\n```';
  const client = { messages: { stream: (p: { system: string; model: string }) => { seen = p; const cbs: ((d: string) => void)[] = [];
    queueMicrotask(() => cbs.forEach((cb) => cb(reply)));
    return { on: (_e: string, cb: (d: string) => void) => cbs.push(cb), finalMessage: async () => { await new Promise((r) => setTimeout(r, 5)); return { stop_reason: "end_turn", usage: { input_tokens: 1000, output_tokens: 100 } }; } }; } } };
  const app = buildApp({ root: ROOT, vaultPath: v.root, dataPath: ":memory:", client: client as never, auth: OFF });
  try {
    const r = await app.inject({ method: "POST", url: "/api/agents/run", payload: { ajan: "kimlik-yonlendirici", gorev: "kimliksizleri yönlendir", tier: "quick" } });
    assert.equal(r.statusCode, 200);
    const events = r.body.split("\n\n").filter((l) => l.startsWith("data: {")).map((l) => JSON.parse(l.slice(6)));
    assert.equal(events.find((e) => e.proposals)!.proposals[0].birincil_kimlik, "avukat");
    assert.equal(events.find((e) => e.usage)!.usage.model, "claude-haiku-5-5");
    assert.match(seen.system!, /kimlik-yonlendirici|Kimlik yönlendirici|birincil kimlik önerir/);
    assert.match(seen.system!, /wisy-oneri/);
    assert.match(seen.system!, /"kimlikler":\[/); // varsayılan bağlam: kimlikler
    const u = (await app.inject("/api/usage")).json(); assert.equal(u.ay.n, 1);
  } finally { await app.close(); }
});

test("API: model, apply, anahtarsız ajan 503", async () => {
  const v = tmpVault();
  const prev = process.env.WISY_MANAGEMENT; delete process.env.WISY_MANAGEMENT;
  process.env.ANTHROPIC_API_KEY ??= "baska-projenin-anahtari"; // genel ad okunmamalı
  const app = buildApp({ root: ROOT, vaultPath: v.root, dataPath: ":memory:", client: null, auth: OFF });
  try {
    const m = await app.inject("/api/model"); assert.equal(m.statusCode, 200); assert.equal(m.json().ids.length, 19);
    const a = await app.inject({ method: "POST", url: "/api/vault/apply", payload: { oneri: { tur: "kart_olustur", baslik: "Marka tekrar edilen vaattir", kaynak: "Sohbet notu", kaynak_turu: "sohbet", taraf: "kisisel" } } });
    assert.equal(a.statusCode, 200, a.body);
    assert.equal((await app.inject("/api/model")).json().noid.length, 1); // kimliksiz kart dikkat listesine düşer
    const r = await app.inject({ method: "POST", url: "/api/agents/run", payload: { ajan: "hoca", gorev: "x" } });
    assert.equal(r.statusCode, 503);
  } finally { if (prev) process.env.WISY_MANAGEMENT = prev; await app.close(); }
});

test("giriş: dağıtımda parolasız başlamaz; parola ve oturum doğrulanır", async () => {
  assert.throws(() => authFromEnv({ NODE_ENV: "production" }), /giriş zorunlu/);
  const hash = hashPassword("dogru-parola-123");
  assert.ok(verifyPassword("dogru-parola-123", hash)); assert.ok(!verifyPassword("yanlis", hash));
  const auth = authFromEnv({ WISY_PASSWORD_HASH: hash, WISY_SESSION_SECRET: "s".repeat(32) });
  const app = buildApp({ root: ROOT, vaultPath: tmpVault().root, dataPath: ":memory:", client: null, auth });
  try {
    assert.equal((await app.inject("/api/model")).statusCode, 401);
    assert.equal((await app.inject("/")).headers.location, "/giris");
    assert.equal((await app.inject("/api/health")).statusCode, 200);
    const bad = await app.inject({ method: "POST", url: "/giris", payload: "parola=yanlis", headers: { "content-type": "application/x-www-form-urlencoded" } });
    assert.equal(bad.headers.location, "/giris?h=1");
    const ok = await app.inject({ method: "POST", url: "/giris", payload: "parola=dogru-parola-123", headers: { "content-type": "application/x-www-form-urlencoded" } });
    const cookie = String(ok.headers["set-cookie"]).split(";")[0]!;
    assert.equal((await app.inject({ url: "/api/model", headers: { cookie } })).statusCode, 200);
    assert.equal((await app.inject({ url: "/api/model", headers: { cookie: cookie.slice(0, -3) + "xxx" } })).statusCode, 401);
  } finally { await app.close(); }
});

test("öneri: Kütüphaneci'nin eksik alanlı kaynak notu tamamlanır, Türkçe enum ASCII'ye çevrilir", () => {
  const v = tmpVault(); const w = new Writer(v, schema);
  w.apply({ tur: "not_olustur", tip: "kaynak", baslik: "Savaş Üzerine — Carl von Clausewitz", alanlar: { birincil_kimlik: "harbiyeli-ve-subay", taraf: "Kişisel" }, govde: "Çekirdek kaynak." });
  const n = v.notes().find((x) => x.type === "kaynak" && x.title.startsWith("Savaş"))!;
  assert.equal(n.fm.kaynak_turu, "kitap"); assert.equal(n.fm.ortam, "fiziksel"); assert.equal(n.fm.taraf, "kisisel");
  assert.equal(check(v.notes(), schema).filter((i) => i.sev === "hata").length, 0);
  // tahmin edilemeyen zorunlu alan (varlik_sinifi) yine adıyla reddedilir
  assert.throws(() => w.apply({ tur: "not_olustur", tip: "varlik", baslik: "Seri kitapçık", alanlar: {} }), /varlik_sinifi/);
  // evre Türkçe yazılsa da şemadaki değere iner
  w.apply({ tur: "alan_guncelle", hedef: "kriz-yonetimi", alan: "evre", deger: "Yaratıcı-aktif" });
  assert.equal(v.get("kriz-yonetimi")!.fm.evre, "yaratici_aktif");
});

test("ajan talimatı şemadaki zorunlu alanları listeler", () => {
  const { agents } = loadAgents(ROOT);
  const s = systemFor(ROOT, agents.find((a) => a.id === "kutuphaneci")!, agents);
  assert.match(s, /- kaynak: kaynak_turu \(kitap\|makale/);
  assert.match(s, /ortam \(fiziksel\|dijital\)/);
});

/* ---- ekler: sentetik zip (xlsx / docx) — gerçek Office dosyasının asgari yapısı ---- */
function zipOf(files: Record<string, string>): Buffer {
  const parts: Buffer[] = [], central: Buffer[] = []; let off = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = deflateRawSync(Buffer.from(text)), n = Buffer.from(name);
    const loc = Buffer.alloc(30); loc.writeUInt32LE(0x04034b50, 0); loc.writeUInt16LE(8, 8); loc.writeUInt32LE(data.length, 18); loc.writeUInt16LE(n.length, 26);
    const cen = Buffer.alloc(46); cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(8, 10); cen.writeUInt32LE(data.length, 20); cen.writeUInt16LE(n.length, 28); cen.writeUInt32LE(off, 42);
    parts.push(loc, n, data); central.push(cen, n); off += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]);
}

test("ekler: xlsx sayfaları sıkı biçimde okunur, docx metni çıkar, PDF belge bloğu olur", () => {
  const xlsx = zipOf({
    "xl/workbook.xml": '<workbook><sheets><sheet name="Bütçe" r:id="rId1"/><sheet name="6. Reklam Varsayımları" r:id="rId2"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>',
    "xl/sharedStrings.xml": "<sst><si><t>Kanal</t></si><si><t>Amazon DE</t></si><si><r><t>RO</t></r><r><t>AS</t></r></si></sst>",
    "xl/worksheets/sheet1.xml": '<sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1"><v>1500.123456</v></c></row><row r="2"/><row r="3"><c r="A3" t="s"><v>1</v></c><c r="B3"><f>SUM(C1)</f></c></row></sheetData>',
    "xl/worksheets/sheet2.xml": '<sheetData><row r="4"><c r="AB4" t="s"><v>2</v></c><c r="AC4" t="inlineStr"><is><t>3,5</t></is></c></row></sheetData>',
  });
  const t = xlsxToText(xlsx);
  assert.match(t, /2 sayfa: Bütçe, 6\. Reklam Varsayımları/);
  assert.match(t, /\n1 \| A: Kanal \| C: 1500\.12\n/);   // seyrek, ondalık kısaltıldı
  assert.match(t, /3 \| A: Amazon DE\n/);                 // boş satır ve değersiz formül atlandı
  assert.match(t, /Bütçe \(2 dolu satır · 1 formül hücresinde kayıtlı değer yok\)/);
  assert.match(t, /4 \| AB: ROAS \| AC: 3,5/);            // çok harfli sütun, bölünmüş zengin metin
  const docx = zipOf({ "word/document.xml": "<w:document><w:body><w:p><w:r><w:t>EuroStep</w:t></w:r><w:r><w:t> planı</w:t></w:r></w:p><w:p><w:r><w:t>Q1 hedef</w:t></w:r></w:p></w:body></w:document>" });
  assert.equal(docxToText(docx), "EuroStep planı\nQ1 hedef");
  const blk = toBlock({ ad: "rapor.xlsx", b64: xlsx.toString("base64") });
  assert.equal(blk.type, "text");
  assert.equal(toBlock({ ad: "s.pdf", b64: "JVBERi0=" }).type, "document");
  assert.equal(toBlock({ ad: "g.PNG", b64: "iVBOR" }).type, "image");
  assert.match((toBlock({ ad: "eski.xls", b64: "AAAA" }) as { text: string }).text, /eski Office biçimi/);
  assert.match((toBlock({ ad: "bozuk.xlsx", b64: "AAAA" }) as { text: string }).text, /okunamadı.*uydurma/);
});

test("API: ekler Claude'a blok olarak gider; kimlik listesi kapsamdan bağımsız", async () => {
  let seen: { system: string; messages: { content: { type: string; text?: string }[] }[] } | null = null;
  const client = { messages: { stream: (p: never) => { seen = p; return { on: () => {}, finalMessage: async () => ({ stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }) }; } } };
  const app = buildApp({ root: ROOT, vaultPath: tmpVault().root, dataPath: ":memory:", client: client as never, auth: OFF });
  try {
    const pdf = await app.inject({ method: "POST", url: "/api/agents/run", payload: { ajan: "hoca", gorev: "oku", kim: "performans-pazarlamaci", dosyalar: [{ ad: "plan.pdf", b64: "JVBERi0=" }, { ad: "not.md", metin: "# başlık" }] } });
    assert.equal(pdf.statusCode, 200);
    const content = seen!.messages.at(-1)!.content;
    assert.deepEqual(content.map((c) => c.type), ["document", "text"]);
    assert.match(content[1]!.text!, /Ek dosya: not\.md[\s\S]*oku$/);
    assert.match(seen!.system, /"kimlik_listesi":\[[^\]]*"id":"seri-girisimci"/); // kapsam performans olsa da
  } finally { await app.close(); }
});

test("Claude hataları Türkçe ve yönlendirici", () => {
  assert.match(claudeError(new Error('400 {"error":{"message":"Your credit balance is too low to access the Anthropic API."}}')), /kredi kalmadı.*Plans & Billing/);
  assert.match(claudeError(new Error("x")), /^x$/);
});
