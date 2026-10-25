// Öneri uygulama — ajanın "wisy-oneri" bloğu ve panelin düzenlemeleri kasaya yalnız buradan yazılır.
// Kurallar: silme yok (yalnız _silinecek/), yayın yok, her yazım sonrası kural denetimi; yeni hata doğarsa yazım geri alınır.
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { check, errorsFor, type Schema } from "./rules.ts";
import { type FM, link1, type Note, slugify, str, type Val, type Vault } from "./vault.ts";

const DIR: Record<string, string> = { kaynak: "10-kaynaklar", kart: "20-kartlar", kavram: "30-kavramlar", kimlik: "40-kimlikler", yetenek: "50-yetenekler", modul: "60-ogrenme", proje: "70-projeler", varlik: "80-varliklar", sicil: "85-sicil", icerik: "90-icerik" };
/** Panelin ve ajanların değiştirebileceği alanlar (tip → alan). Kimlik ve şema alanları dışı yazılamaz. */
const EDITABLE: Record<string, string[]> = {
  kart: ["durum", "tema", "sayfa", "taraf", "birincil_kimlik", "ikincil_kimlik", "bekleme_bitis"],
  yetenek: ["evre", "hedef_evre", "kanitlar"],
  modul: ["durum", "birincil_kimlik", "ikincil_kimlik", "yetenekler", "kavramlar", "cikti"],
  proje: ["durum", "birincil_kimlik", "ikincil_kimlik", "kavramlar", "yetenekler", "moduller", "varliklar", "aktarim", "kesisim"],
  icerik: ["durum", "birincil_kimlik", "yayin_tarihi", "uyum", "kanal", "basamak"],
  kavram: ["eksen_disiplin", "eksen_fonksiyon", "eksen_sektor", "ilgili"],
  varlik: ["nakit_akisi_katkisi", "degerleme_katkisi", "lisans", "kaynak_proje", "birincil_kimlik"],
  sicil: ["gecerlilik", "yenileme", "docentlik_kategorisi", "birincil_kimlik"],
};
const LINKY = new Set(["tema", "birincil_kimlik", "ikincil_kimlik", "yetenekler", "kavramlar", "moduller", "varliklar", "cikti", "kaynak_proje", "ilgili", "kanitlar", "kartlar", "kaynak", "kaynaklar"]);

export const Proposal = z.discriminatedUnion("tur", [
  z.object({ tur: z.literal("kart_olustur"), baslik: z.string().min(4).max(200), fikir: z.string().max(1200).default(""), baglam: z.string().max(800).optional(), alinti: z.string().max(400).optional(),
    kaynak: z.string().max(200).optional(), kaynak_turu: z.string().optional(), sayfa: z.string().max(20).optional(), tema: z.string().max(120).optional(),
    birincil_kimlik: z.string().nullable().optional(), ikincil_kimlik: z.string().nullable().optional(), taraf: z.enum(["kisisel", "sirket", "ortak"]).default("kisisel"), gerekce: z.string().optional() }),
  z.object({ tur: z.literal("kimlik_ata"), hedef: z.string(), birincil_kimlik: z.string(), ikincil_kimlik: z.string().nullable().optional(), gerekce: z.string().optional() }),
  z.object({ tur: z.literal("alan_guncelle"), hedef: z.string(), alan: z.string(), deger: z.any(), gerekce: z.string().optional() }),
  z.object({ tur: z.literal("kanit_ekle"), hedef: z.string(), kanit: z.string(), gerekce: z.string().optional() }),
  z.object({ tur: z.literal("not_olustur"), tip: z.enum(["kaynak", "kavram", "modul", "proje", "icerik", "varlik", "sicil"]), baslik: z.string().min(2).max(200), alanlar: z.record(z.string(), z.any()).default({}), govde: z.string().max(8000).default(""), gerekce: z.string().optional() }),
]);
export type Proposal = z.infer<typeof Proposal>;
export interface Applied { ok: true; yazilan: string[]; ozet: string }

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const wl = (id: string) => `[[${id}]]`;
const bad = (msg: string, statusCode = 400) => Object.assign(new Error(msg), { statusCode });

export class Writer {
  constructor(private vault: Vault, private schema: Schema) {}

  /** id, başlık ya da ad ile not bul (isteğe bağlı tip süzgeci) */
  resolve(ref: string | null | undefined, type?: string): Note | undefined {
    if (!ref) return undefined;
    const id = link1(ref) ?? ref.trim();
    const notes = this.vault.notes().filter((n) => !type || n.type === type);
    const lo = (s: string) => s.toLocaleLowerCase("tr").trim();
    return notes.find((n) => n.id === id) ?? notes.find((n) => n.id === slugify(id)) ?? notes.find((n) => [n.title, str(n.fm.ad), str(n.fm.baslik)].some((t) => t && lo(t) === lo(id)));
  }
  private kimlik(ref: string | null | undefined): string | null {
    if (!ref) return null;
    const n = this.resolve(ref, "kimlik"); if (!n) throw bad(`Kimlik bulunamadı: ${ref}`);
    return wl(n.id);
  }
  /** Tema adı kavram değilse kavram taslağı açılır (eksenleri Haritacı doldurur) */
  private ensureKavram(name: string, log: string[]): string {
    const n = this.resolve(name, "kavram"); if (n) return n.id;
    const id = this.free(slugify(name)); // dosya adı kasada benzersiz olmalı: [[bağlantı]] adla çözülür
    this.vault.create(`${DIR.kavram}/${id}.md`, { type: "kavram", eksen_disiplin: "belirlenecek", eksen_fonksiyon: "belirlenecek", eksen_sektor: "belirlenecek", ilgili: [], olusturma: today() },
      `# ${name}\n\nHaritacı eksenleri dolduracak.\n\n## Bu koleksiyondaki kartlar\n\n\`\`\`dataview\nLIST FROM "20-kartlar" WHERE contains(string(tema), "${id}")\n\`\`\``);
    log.push(`${DIR.kavram}/${id}.md`); return id;
  }
  private ensureKaynak(name: string, tur: string, taraf: string, log: string[]): string {
    const n = this.resolve(name, "kaynak"); if (n) return n.id;
    const id = this.free(slugify(name)); // dosya adı kasada benzersiz olmalı: [[bağlantı]] adla çözülür
    const kt = (this.schema.enums.kaynak_turu ?? []).includes(tur) ? tur : "web";
    this.vault.create(`${DIR.kaynak}/${id}.md`, { type: "kaynak", baslik: name, kaynak_turu: kt, ortam: kt === "kitap" ? "fiziksel" : "dijital", taraf, olusturma: today() }, `# ${name}\n\nPanelden hızlı kartla açıldı; Kütüphaneci ayrıntıları tamamlar.`);
    log.push(`${DIR.kaynak}/${id}.md`); return id;
  }
  /** Yazım sonrası denetim: yeni hata varsa geri al */
  private guard(id: string, undo: () => void) {
    const errs = errorsFor(check(this.vault.notes(), this.schema), id);
    if (errs.length) { undo(); this.vault.invalidate(); throw bad(`Kural ihlali, yazım geri alındı: ${errs.map((e) => e.msg).join("; ")}`, 422); }
  }
  private setGuarded(n: Note, key: string, value: Val) {
    const p = this.vault.abs(n.rel), before = readFileSync(p, "utf-8");
    this.vault.setField(n.id, key, value);
    this.guard(n.id, () => writeFileSync(p, before, "utf-8"));
  }
  private createGuarded(rel: string, fm: FM, body: string): Note {
    const n = this.vault.create(rel, fm, body);
    this.guard(n.id, () => unlinkSync(this.vault.abs(rel)));
    return n;
  }

  apply(raw: unknown): Applied {
    const p = Proposal.parse(raw);
    const log: string[] = [];
    switch (p.tur) {
      case "kart_olustur": {
        const kitap = (p.kaynak_turu ?? "kitap") === "kitap" && !!p.kaynak;
        const kaynak = p.kaynak ? this.ensureKaynak(p.kaynak, p.kaynak_turu ?? "kitap", p.taraf, log) : this.ensureKaynak("Kişisel not", "deneyim", p.taraf, log);
        const tema = p.tema ? this.ensureKavram(p.tema, log) : null;
        const kim = this.kimlik(p.birincil_kimlik);
        const id = `${today().replace(/-/g, "")}-${slugify(p.baslik, 48)}`;
        const rel = `${DIR.kart}/${this.free(id)}.md`;
        // kitap: Greene beklemesi 10 gün; diğerleri kimlik varsa hazır, yoksa taslak
        const durum = kitap ? "beklemede" : kim ? "hazir" : "taslak";
        const fm: FM = { type: "kart", kaynak: wl(kaynak), sayfa: p.sayfa ?? null, tema: tema ? wl(tema) : null, birincil_kimlik: kim, ikincil_kimlik: this.kimlik(p.ikincil_kimlik), taraf: p.taraf, durum, bekleme_bitis: kitap ? addDays(10) : null, olusturma: today() };
        const body = `# ${p.baslik.replace(/\.$/, "")}\n\n**Fikir:** ${p.fikir || p.baslik}\n\n**Bağlam:** ${p.baglam ?? ""}${p.alinti ? `\n\n**Alıntı:** ${p.alinti}` : ""}`;
        const n = this.createGuarded(rel, fm, body); log.push(n.rel);
        return { ok: true, yazilan: log, ozet: `Kart yazıldı (${durum})${kitap ? ` · ${addDays(10)} tarihinde hazır` : ""}` };
      }
      case "kimlik_ata": {
        const n = this.resolve(p.hedef); if (!n?.type) throw bad(`Kayıt bulunamadı: ${p.hedef}`, 404);
        if (!["kart", "modul", "proje", "icerik", "varlik", "sicil"].includes(n.type)) throw bad(`${n.type} kaydına kimlik atanmaz`);
        this.setGuarded(n, "birincil_kimlik", this.kimlik(p.birincil_kimlik));
        if (p.ikincil_kimlik) this.setGuarded(this.vault.get(n.id)!, "ikincil_kimlik", this.kimlik(p.ikincil_kimlik));
        if (n.type === "kart" && str(n.fm.durum) === "taslak" && !str(n.fm.bekleme_bitis)) this.setGuarded(this.vault.get(n.id)!, "durum", "hazir");
        return { ok: true, yazilan: [n.rel], ozet: `${n.title}: birincil kimlik atandı` };
      }
      case "alan_guncelle": {
        const n = this.resolve(p.hedef); if (!n?.type) throw bad(`Kayıt bulunamadı: ${p.hedef}`, 404);
        const allowed = EDITABLE[n.type] ?? [];
        if (!allowed.includes(p.alan)) throw bad(`${n.type}.${p.alan} panelden/ajandan değiştirilemez (izinli: ${allowed.join(", ")})`, 403);
        this.setGuarded(n, p.alan, this.norm(p.alan, p.deger, n));
        return { ok: true, yazilan: [n.rel], ozet: `${n.title}: ${p.alan} güncellendi` };
      }
      case "kanit_ekle": {
        const n = this.resolve(p.hedef, "yetenek"); if (!n) throw bad(`Yetenek bulunamadı: ${p.hedef}`, 404);
        const cur = Array.isArray(n.fm.kanitlar) ? (n.fm.kanitlar as Val[]) : [];
        const k = this.resolve(p.kanit); const v = k ? wl(k.id) : p.kanit;
        this.setGuarded(n, "kanitlar", [...cur, v]);
        return { ok: true, yazilan: [n.rel], ozet: `${n.title}: kanıt eklendi` };
      }
      case "not_olustur": {
        const id = this.free(slugify(p.baslik));
        const fm: FM = { type: p.tip };
        const titleKey = p.tip === "varlik" || p.tip === "sicil" ? "ad" : p.tip === "kavram" ? null : "baslik";
        if (titleKey) fm[titleKey] = p.baslik;
        for (const [k, v] of Object.entries(p.alanlar)) if (k !== "type") fm[k] = this.norm(k, v as Val);
        if (!("taraf" in fm) && p.tip !== "kavram" && p.tip !== "sicil") fm.taraf = "kisisel";
        // proje: hikaye kartı doluysa bile ilk durum fikir/hazırlık — aktif'e geçiş ayrı onayla
        if (p.tip === "proje" && ["aktif", "tamamlandi"].includes(str(fm.durum))) fm.durum = "hazirlik";
        if (p.tip === "icerik" && ["onay", "yayinda"].includes(str(fm.durum))) fm.durum = "taslak";
        fm.olusturma = today();
        const n = this.createGuarded(`${DIR[p.tip]}/${id}.md`, fm, `# ${p.baslik}\n\n${p.govde}`);
        return { ok: true, yazilan: [n.rel], ozet: `${p.tip} notu açıldı: ${p.baslik}` };
      }
    }
  }
  private free(id: string) { const ids = new Set(this.vault.notes().map((n) => n.id)); let x = id, i = 2; while (ids.has(x)) x = `${id}-${i++}`; return x; }
  /** Bağlantı alanlarını [[id]] biçimine çevir; listeleri koru */
  private norm(key: string, v: Val, _n?: Note): Val {
    if (!LINKY.has(key)) return v;
    const one = (x: Val): Val => { if (x == null || x === "") return null; const s = String(x); if (s.startsWith("[[")) return s; const t = this.resolve(s); return t ? wl(t.id) : s; };
    if (Array.isArray(v)) return v.map(one).filter((x) => x != null);
    if (["yetenekler", "kavramlar", "moduller", "varliklar", "ilgili", "kanitlar", "kartlar", "kaynaklar"].includes(key)) return v == null ? [] : [one(v)].filter((x) => x != null);
    return one(v);
  }
}
