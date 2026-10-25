import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { extractProposals, loadAgents } from "./agents.ts";
import { buildApp } from "./app.ts";
import { authFromEnv, hashPassword, verifyPassword } from "./auth.ts";
import { Writer } from "./apply.ts";
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
