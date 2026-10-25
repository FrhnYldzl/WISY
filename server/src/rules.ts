// Kural motoru — scripts/validate_vault.py ile aynı denetimler (panel ve ajan yazımları bunu kullanır).
// Şema schema/entities.yaml'dan okunur; burada yalnızca o dosyanın biçimine uygun küçük bir okuyucu var.
import { readFileSync } from "node:fs";
import { isEmpty, link1, links, type Note, str } from "./vault.ts";

export interface Schema { enums: Record<string, string[]>; types: Record<string, { required: string[]; enums: Record<string, string>; links: string[]; hikaye_zinciri?: string[] }> }
export interface Issue { sev: "hata" | "uyari"; rel: string; id: string; msg: string; kural: string }

/** entities.yaml: enums (ad: [liste]) ve types (tip → required/enums/links/hikaye_zinciri) */
export function loadSchema(path: string): Schema {
  const out: Schema = { enums: {}, types: {} };
  let sec = "", type = "";
  const list = (s: string) => s.replace(/^\[|\]$/g, "").split(",").map((x) => x.trim()).filter(Boolean);
  for (const raw of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const top = line.match(/^(\w+):\s*$/);
    if (top) { sec = top[1]!; type = ""; continue; }
    if (sec === "enums") { const m = line.match(/^\s{2}(\w+):\s*(\[.*\])/); if (m) out.enums[m[1]!] = list(m[2]!); }
    if (sec === "types") {
      const t = line.match(/^\s{2}(\w+):\s*$/);
      if (t) { type = t[1]!; out.types[type] = { required: [], enums: {}, links: [] }; continue; }
      const f = line.match(/^\s{4}(\w+):\s*(.+)$/);
      if (f && type) {
        const [, k, v] = f as unknown as [string, string, string];
        if (k === "enums") out.types[type]!.enums = Object.fromEntries(v.replace(/^\{|\}$/g, "").split(",").map((p) => p.split(":").map((x) => x.trim()) as [string, string]).filter((p) => p[0]));
        else if (k === "required" || k === "links" || k === "hikaye_zinciri") out.types[type]![k] = list(v);
      }
    }
  }
  return out;
}

export function check(notes: Note[], schema: Schema, today = new Date()): Issue[] {
  const names = new Set(notes.map((n) => n.id));
  const iso = today.toISOString().slice(0, 10);
  const out: Issue[] = [];
  const add = (n: Note, sev: Issue["sev"], kural: string, msg: string) => out.push({ sev, rel: n.rel, id: n.id, msg, kural });
  const seen = new Map<string, Note>();
  for (const n of notes) {
    const o = seen.get(n.id);
    if (o) add(n, "hata", "cift-ad", `aynı dosya adı ${o.rel} ile çakışıyor; [[${n.id}]] belirsiz`);
    else seen.set(n.id, n);
  }
  for (const n of notes) {
    if (!n.type) continue;
    const spec = schema.types[n.type];
    if (!spec) { add(n, "hata", "tip", `bilinmeyen type '${n.type}'`); continue; }
    const fm = n.fm;
    for (const f of spec.required) if (isEmpty(fm[f])) add(n, "hata", f === "birincil_kimlik" ? "kimliksiz" : f === "tema" ? "temasiz" : "zorunlu", `zorunlu alan boş: ${f}`);
    for (const [f, en] of Object.entries(spec.enums)) {
      const v = fm[f];
      if (!isEmpty(v) && !(schema.enums[en] ?? []).includes(str(v))) add(n, "hata", "enum", `${f} geçersiz '${str(v)}'`);
    }
    for (const f of spec.links) {
      const v = fm[f]; if (isEmpty(v)) continue;
      const found = links(v);
      if (!found.length) add(n, "hata", "baglanti", `${f} [[bağlantı]] biçiminde olmalı`);
      for (const t of found) if (!names.has(t)) add(n, "hata", "kirik", `${f} -> [[${t}]] kasada yok`);
    }
    if (fm.taraf === "ortak" && !["kisisel", "sirket"].includes(str(fm.birincil_taraf))) add(n, "hata", "taraf", "taraf 'ortak' ise birincil_taraf (kisisel|sirket) zorunlu");
    if (n.type === "proje") {
      const missing = (spec.hikaye_zinciri ?? []).filter((f) => isEmpty(fm[f]));
      if (["aktif", "tamamlandi"].includes(str(fm.durum)) && missing.length) add(n, "hata", "hikaye", `hikaye kartı eksik, durum '${str(fm.durum)}' olamaz. Boş halkalar: ${missing.join(", ")}`);
      else if (missing.length) add(n, "uyari", "hikaye", `hikaye kartında boş halkalar: ${missing.join(", ")}`);
    }
    if (n.type === "icerik" && ["onay", "yayinda"].includes(str(fm.durum))) {
      const k = links(fm.birincil_kimlik).join(" ");
      const uy = (fm.uyum ?? {}) as Record<string, unknown>;
      if (k.includes("avukat") && uy.tbb !== true) add(n, "hata", "uyum", "avukat kimlikli içerikte uyum.tbb: true olmadan onay/yayın yok");
      if (k.includes("yatirimci") && uy.spk !== true) add(n, "hata", "uyum", "yatırımcı kimlikli içerikte uyum.spk: true olmadan onay/yayın yok");
    }
    if (n.type === "kart" && fm.durum === "hazir" && !isEmpty(fm.bekleme_bitis)) {
      const b = str(fm.bekleme_bitis);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b)) add(n, "hata", "bekleme", "bekleme_bitis YYYY-MM-DD olmalı");
      else if (b > iso) add(n, "hata", "bekleme", "bekleme süresi dolmadan kart 'hazir' olamaz");
    }
  }
  return out;
}

/** Bir yazım sonrası yeni hata doğuyorsa yazımı geri almak için: yalnız o notun hataları. Kimliksiz/temasız taslak geri alınmaz — panoda "dikkat" olarak görünür (tasarım: kimliksiz kayıt). */
export const errorsFor = (issues: Issue[], id: string) => issues.filter((i) => i.id === id && i.sev === "hata" && i.kural !== "kimliksiz" && i.kural !== "temasiz");
export { link1 };
