// Ajan orkestratörü — Wisy'nin öğrenme ajanları panelde Claude ile çalışır.
// Tek kaynak: .claude/agents/*.md (Claude Code alt ajanları) ve .claude/commands/*.md (akışlar). Panel bunları kopyalamaz, okur.
// Ajan kasaya yazmaz: değişiklikleri "wisy-oneri" bloğunda önerir; Ferhan kabul edince apply.ts kural denetimiyle yazar.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Proposal } from "./apply.ts";
import type { Model } from "./model.ts";
import { loadSchema } from "./rules.ts";
import { parseFrontmatter, str } from "./vault.ts";

export interface AgentDef { id: string; ad: string; katman: string; kisa: string; aciklama: string; govde: string; kaynaklar: string[] }
export interface FlowDef { id: string; ad: string; aciklama: string; adimlar: string[]; girdi: string; govde: string }

/** Katman, monogram ve varsayılan bağlam (docs/02-mimari.md tablosu) */
const META: Record<string, { ad: string; katman: string; kisa: string; kaynaklar: string[] }> = {
  orkestrator: { ad: "Orkestratör", katman: "0–10", kisa: "OR", kaynaklar: ["kimlikler", "kartlar", "kavramlar", "yetenekler", "ogrenme", "projeler", "varliklar", "icerik", "kurallar"] },
  kutuphaneci: { ad: "Kütüphaneci", katman: "0", kisa: "KT", kaynaklar: ["kaynaklar", "kartlar"] },
  bultenci: { ad: "Bültenci", katman: "1", kisa: "B", kaynaklar: ["kartlar", "kaynaklar", "icerik", "kimlikler"] },
  haritaci: { ad: "Haritacı", katman: "2–3", kisa: "H", kaynaklar: ["kavramlar", "kartlar"] },
  "kimlik-yonlendirici": { ad: "Kimlik yönlendirici", katman: "4", kisa: "KY", kaynaklar: ["kimlikler", "kimliksiz", "kartlar"] },
  "yetenek-olcer": { ad: "Yetenek ölçer", katman: "5", kisa: "YÖ", kaynaklar: ["kimlikler", "yetenekler", "projeler", "sicil"] },
  hoca: { ad: "Hoca", katman: "6", kisa: "HC", kaynaklar: ["yetenekler", "ogrenme", "kaynaklar", "kartlar", "kimlikler"] },
  "proje-mimari": { ad: "Proje mimarı", katman: "6", kisa: "PM", kaynaklar: ["projeler", "kimlikler", "kavramlar", "yetenekler", "ogrenme", "sinerji"] },
  editor: { ad: "Editör", katman: "7", kisa: "E", kaynaklar: ["kartlar", "icerik", "kimlikler"] },
  "portfoy-yoneticisi": { ad: "Portföy yöneticisi", katman: "7", kisa: "PY", kaynaklar: ["projeler", "varliklar", "sicil"] },
  "yayin-planlayici": { ad: "Yayın planlayıcı", katman: "8", kisa: "YP", kaynaklar: ["icerik", "kartlar"] },
  "depo-sorumlusu": { ad: "Depo sorumlusu", katman: "9", kisa: "DS", kaynaklar: ["varliklar", "projeler"] },
  "sicil-tutucu": { ad: "Sicil tutucu", katman: "10", kisa: "ST", kaynaklar: ["sicil", "yetenekler", "kimlikler"] },
};
export const SOURCES = ["kimlikler", "kimliksiz", "kartlar", "kaynaklar", "kavramlar", "yetenekler", "ogrenme", "projeler", "varliklar", "icerik", "sicil", "sinerji", "kurallar"] as const;

export function loadAgents(root: string): { agents: AgentDef[]; flows: FlowDef[] } {
  const dir = join(root, ".claude", "agents");
  const agents: AgentDef[] = [{ id: "orkestrator", ...META.orkestrator!, aciklama: "Wisy'nin ana orkestratörü. İsteği ana hikayenin doğru katmanına yönlendirir, gerekirse birkaç ajanın işini sırayla yapar.", govde: "" }];
  if (existsSync(dir)) for (const f of readdirSync(dir).filter((x) => x.endsWith(".md")).sort()) {
    const { fm, body } = parseFrontmatter(readFileSync(join(dir, f), "utf-8"));
    const id = str(fm?.name) || f.replace(/\.md$/, "");
    const m = META[id] ?? { ad: id, katman: "?", kisa: id.slice(0, 2).toUpperCase(), kaynaklar: ["kartlar"] };
    agents.push({ id, ...m, aciklama: str(fm?.description), govde: body.trim() });
  }
  agents.sort((a, b) => parseFloat(a.katman) - parseFloat(b.katman));
  const cdir = join(root, ".claude", "commands");
  const flows: FlowDef[] = [];
  const ids = agents.map((a) => a.id).filter((x) => x !== "orkestrator");
  if (existsSync(cdir)) for (const f of readdirSync(cdir).filter((x) => x.endsWith(".md")).sort()) {
    const { fm, body } = parseFrontmatter(readFileSync(join(cdir, f), "utf-8"));
    // akış adımları: komut metninde ajanların geçtiği sıra
    const order = ids.map((id) => [id, body.indexOf(`\`${id}\``)] as const).filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1]).map(([id]) => id);
    flows.push({ id: f.replace(/\.md$/, ""), ad: "/" + f.replace(/\.md$/, ""), aciklama: str(fm?.description), adimlar: order.length ? order : ["orkestrator"], girdi: /\$ARGUMENTS/.test(body) ? (body.match(/Girdi:\s*\$ARGUMENTS\s*\(([^)]+)\)/)?.[1] ?? "girdi") : "", govde: body.trim() });
  }
  return { agents, flows };
}

/* ---------------- bağlam ---------------- */
export function contextFor(model: Model, sources: string[], kim?: string | null, extra?: { kaynaklar?: { id: string; baslik: string; tur: string }[] }) {
  const K = (x: { kim?: string | null; kim2?: string | null }) => !kim || x.kim === kim || x.kim2 === kim;
  // kimlik listesi her zaman var (kısa): kapsam tek kimliğe daralsa da ajan başka bir kimliği önerebilsin
  const out: Record<string, unknown> = { bugun: model.today, kimlik_listesi: model.ids.map((i) => ({ id: i.slug, ad: i.ad, aile: i.aile })) };
  const S = new Set(sources);
  if (S.has("kimlikler")) out.kimlikler = model.ids.filter((i) => !kim || i.slug === kim).map(({ slug, ad, aile, zaman, soru, evre, yet, sinir, kanal, son }) => ({ id: slug, ad, aile, zaman, ana_soru: soru, evre, yetenekler: yet, sinir, kanal, son_kayit_gun: son }));
  if (S.has("kimliksiz")) out.kimliksiz = model.noid;
  if (S.has("kartlar")) out.kartlar = model.cards.filter(K).map(({ id, idea, tema, temaId, kim: k, kim2, taraf, durum, kalan, kaynak, tur, sayfa, fikir }) => ({ id, baslik: idea, tema: temaId ?? tema, birincil_kimlik: k, ikincil_kimlik: kim2, taraf, durum, bekleme_kalan_gun: durum === "beklemede" ? kalan : undefined, kaynak, tur, sayfa, fikir }));
  if (S.has("kaynaklar") && extra?.kaynaklar) out.kaynaklar = extra.kaynaklar;
  if (S.has("kavramlar")) out.kavramlar = model.concepts.map(({ id, ad, n, d, f, s, p }) => ({ id, ad, kart: n, eksen_disiplin: d, eksen_fonksiyon: f, eksen_sektor: s, projede: !!p }));
  if (S.has("yetenekler")) out.yetenekler = model.skills.filter((s) => !kim || s.kim === kim).map(({ id, ad, kim: k, evre, hedef, kanit, son }) => ({ id, ad, kimlik: k, evre: evre ?? "belirlenecek", hedef_evre: hedef ?? "belirlenecek", kanit, son_kanit: son }));
  if (S.has("ogrenme")) out.moduller = model.modules.filter(K).map(({ file: _f, ...m }) => m);
  if (S.has("projeler")) out.projeler = model.projects.filter(K).map(({ id, baslik, durum, taraf, kim: k, kim2, rings, not }) => ({ id, baslik, durum, taraf, birincil_kimlik: k, ikincil_kimlik: kim2, halkalar: Object.fromEntries(rings.map((r) => [r[0], r[2] ? r[1] : null])), aktarim: not }));
  if (S.has("varliklar")) out.varliklar = model.assets;
  if (S.has("icerik")) out.icerik = model.content.filter(K).map(({ file: _f, ...c }) => c);
  if (S.has("sicil")) out.sicil = model.sicil;
  if (S.has("sinerji")) out.sinerji = model.syn;
  if (S.has("kurallar")) out.kural_ihlalleri = model.issues.slice(0, 60).map((i) => `${i.sev.toUpperCase()} ${i.rel}: ${i.msg}`);
  return out;
}

/* ---------------- sistem talimatı ---------------- */
const PROTOCOL = `## Öneri protokolü (kasaya yazmanın tek yolu)
Panel içinde çalışıyorsun: dosya araçların yok, kasa bağlamı aşağıda JSON olarak var. Kasaya doğrudan yazamazsın.
Bir değişiklik öneriyorsan yanıtının SONUNA tek bir blok ekle:
\`\`\`wisy-oneri
[ { "tur": "...", ... , "gerekce": "tek cümle" } ]
\`\`\`
İzinli türler:
- kart_olustur: { baslik (fikir, tek cümle), fikir (1–3 cümle, Ferhan'ın sesiyle), baglam, kaynak (kaynak adı veya id), kaynak_turu (kitap|makale|kurs|deneyim|sohbet|web…), sayfa, tema (kavram id veya adı), birincil_kimlik (kimlik id), ikincil_kimlik, taraf (kisisel|sirket|ortak) }
- kimlik_ata: { hedef (kayıt id), birincil_kimlik (kimlik id), ikincil_kimlik? }
- alan_guncelle: { hedef (kayıt id), alan, deger } — örn. yetenek evre/hedef_evre (cirak|yaratici_aktif|usta), kavram eksen_disiplin/eksen_fonksiyon/eksen_sektor, kart durum, proje moduller/varliklar
- kanit_ekle: { hedef (yetenek id), kanit (proje/içerik/sicil id veya kısa metin) }
- not_olustur: { tip (kaynak|kavram|modul|proje|icerik|varlik|sicil), baslik, alanlar {frontmatter alanları, bağlantılar id olarak}, govde (markdown) }
Kurallar: id'leri yalnız bağlamdan al, uydurma. Silme, yayınlama, dışa aktarma önerme. Kimlik belirsizse öneri yerine iki seçenekli soru sor.
Sunucu her öneriyi şemaya ve kurallara göre denetler; ihlal eden öneri yazılmaz. Proje 'aktif', içerik 'onay/yayinda' önerme — bunlar Ferhan'ın ayrı kararıdır.
Öneri yoksa blok ekleme.`;

export function systemFor(root: string, agent: AgentDef, all: AgentDef[]): string {
  const claude = readFileSync(join(root, "CLAUDE.md"), "utf-8");
  const rules = claude.split(/^## /m).find((s) => s.startsWith("Değişmez kurallar")) ?? "";
  const main = claude.split(/^## /m).find((s) => s.startsWith("Ana hikaye")) ?? "";
  const uyum = existsSync(join(root, "docs", "06-kurallar-ve-uyum.md")) ? readFileSync(join(root, "docs", "06-kurallar-ve-uyum.md"), "utf-8") : "";
  // ajan tanımındaki dosya-aracı adımları panelde sunucuya devredilir
  const body = agent.govde.replace(/^- Her yazımdan sonra.*$/m, "- Doğrulayıcı sunucuda her yazımdan sonra otomatik çalışır.").replace(/^- Kasaya yazmadan önce.*$/m, "- Kasaya yazmak yerine değişiklikleri öneri bloğunda listele.");
  // not_olustur için zorunlu alanlar ve izinli değerler şemadan (schema/entities.yaml) — şema değişince talimat da değişir
  const schema = loadSchema(join(root, "schema", "entities.yaml"));
  const fields = ["kaynak", "kavram", "modul", "proje", "icerik", "varlik", "sicil"].map((t) => {
    const s = schema.types[t]; if (!s) return "";
    const req = s.required.filter((f) => !["type", "baslik", "ad"].includes(f)).map((f) => { const en = s.enums[f]; return en ? `${f} (${(schema.enums[en] ?? []).join("|")})` : f; });
    return `- ${t}: ${req.join(", ") || "—"}`;
  }).filter(Boolean).join("\n");
  const roster = all.filter((a) => a.id !== "orkestrator").map((a) => `- ${a.ad} (\`${a.id}\`, katman ${a.katman}): ${a.aciklama.replace(/^Wisy katman [^.]*\.\s*/, "")}`).join("\n");
  const self = agent.id === "orkestrator"
    ? `Sen Wisy'nin orkestratörüsün. Ferhan'ın isteğini ana hikayenin doğru katmanına yönlendirirsin. Ajan kadron:\n${roster}\n\nYanıtına hangi ajanın bakışıyla çalıştığını bir satırla belirterek başla ("Yönlendirme: Hoca → Proje mimarı"). Gerekirse birkaç ajanın işini sırayla yap.`
    : body;
  return [
    `Wisy, Ferhan'ın kişisel Vibe Management sistemi: okunan ve öğrenilen her şeyi kartlara, kavramlara, kimliklere ve yeteneklere bağlar; öğrenmeyi projelere, projeleri kalıcı varlıklara dönüştürür.`,
    self, `## ${main.trim()}`, `## ${rules.trim()}`, uyum.trim(), PROTOCOL,
    `## not_olustur zorunlu alanları (alanlar içinde ver; değerler ASCII, parantezdeki listeden)\n${fields}\nBağlantı alanları (birincil_kimlik, yetenekler, kavramlar…) bağlamdaki id'lerle. Bir alanı bilmiyorsan öneriyi verme, Ferhan'a sor.`,
    `## Yazım\nTürkçe, sakin ve kesin. Kısa paragraflar, gerektiğinde tablo. Emoji yok, motivasyon sloganı yok. Bağlamda olmayan rakam uydurma; bilinmeyeni "belirlenecek" diye yaz.`,
  ].join("\n\n");
}

/** Yanıt metninden öneri bloğunu ayıkla ve şemaya göre doğrula */
export function extractProposals(text: string) {
  const m = text.match(/```wisy-oneri\s*([\s\S]*?)```/);
  if (!m) return { proposals: [], invalid: [] as { raw: unknown; hata: string }[] };
  let arr: unknown;
  try { arr = JSON.parse(m[1]!.trim()); } catch (e) { return { proposals: [], invalid: [{ raw: m[1], hata: `JSON okunamadı: ${(e as Error).message}` }] }; }
  const list = Array.isArray(arr) ? arr : [arr];
  const proposals: unknown[] = [], invalid: { raw: unknown; hata: string }[] = [];
  for (const p of list) { const r = Proposal.safeParse(p); if (r.success) proposals.push(r.data); else invalid.push({ raw: p, hata: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }); }
  return { proposals, invalid };
}
