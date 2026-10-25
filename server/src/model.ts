// Kasa → panel modeli. Panel (public/app.js) örnek veriyle aynı biçimi okur; böylece Claude Design'da onaylanan
// ekranlar hiç değişmeden canlı kasayla çalışır. Bu dosya yalnız okur; yazım vault.ts + apply.ts'tedir.
import { type Issue } from "./rules.ts";
import { isEmpty, link1, links, type Note, str, type Val } from "./vault.ts";

const DAY = 86400000;
const EVRE: Record<string, string | null> = { cirak: "cirak", yaratici_aktif: "yaratici", yaratici: "yaratici", usta: "usta", belirlenecek: null };
const KANAL: Record<string, string> = { linkedin: "LinkedIn", bulten: "Bülten", web: "Web arşivi", akademik: "Akademik", video: "Video ve ses", github: "GitHub", huggingface: "Hugging Face", kaggle: "Kaggle", zenodo: "Zenodo", kurs: "Kurs", kapali: "Kapalı" };
const BASAMAK: Record<string, string> = { kart: "Kart", gunun_karti: "Günün kartı", bulten: "Bülten", seri: "Seri", kalici: "Kalıcı" };
const SINIF: Record<string, string> = { donen: "donen", maddi: "maddi", finansal: "finansal", gayri_maddi: "gayri", entelektuel: "entel" };
const PDURUM: Record<string, string> = { tamamlandi: "tamam" };
const MDURUM: Record<string, string> = { tamamlandi: "tamam" };

const dateOf = (n: Note) => { const s = str(n.fm.olusturma); return /^\d{4}-\d{2}-\d{2}/.test(s) ? new Date(s.slice(0, 10)).getTime() : n.mtime; };
const daysBetween = (a: number, b: number) => Math.round((a - b) / DAY);
const firstPara = (body: string) => body.replace(/^#.*$/m, "").split(/\r?\n\r?\n/).map((p) => p.trim()).find((p) => p && !p.startsWith("#") && !p.startsWith("|") && !p.startsWith("```")) ?? "";
const bold = (body: string, label: string) => body.match(new RegExp(`\\*\\*${label}[^*]*:\\*\\*\\s*(.+)`))?.[1]?.trim() ?? "";
const section = (body: string, head: string) => { const m = body.split(new RegExp(`^##\\s+${head}.*$`, "m"))[1]; return m ? m.split(/^##\s/m)[0]! : ""; };

export function buildModel(notes: Note[], issues: Issue[], today = new Date()) {
  const by = new Map(notes.map((n) => [n.id, n]));
  const T = (t: string) => notes.filter((n) => n.type === t);
  const title = (id: string | null) => { if (!id) return ""; const n = by.get(id); return n ? str(n.fm.ad) || str(n.fm.baslik) || n.title : id; };
  const now = today.getTime();
  const kimOf = (n: Note) => link1(n.fm.birincil_kimlik);
  const records = notes.filter((n) => ["kart", "modul", "proje", "icerik", "varlik", "sicil"].includes(n.type ?? ""));

  /* kimlikler */
  const skillsAll = T("yetenek");
  const ids = T("kimlik").map((n) => {
    const linked = records.filter((r) => kimOf(r) === n.id || link1(r.fm.ikincil_kimlik) === n.id);
    const dates = linked.map(dateOf);
    const last = dates.length ? Math.max(...dates) : null;
    return {
      slug: n.id, ad: str(n.fm.ad) || n.title, aile: str(n.fm.aile) || "kisisel", zaman: str(n.fm.zaman) || "guncel", dikey: str(n.fm.dikey),
      baglam: str(n.fm.baglam), soru: str(n.fm.ana_soru), evre: EVRE[str(n.fm.evre)] ?? null,
      yet: skillsAll.filter((s) => link1(s.fm.kimlik) === n.id).map((s) => str(s.fm.ad) || s.title),
      sinir: str(n.fm.sinir), kanal: str(n.fm.kanal), son: last == null ? null : Math.max(0, daysBetween(now, last)),
      act: dates.filter((d) => now - d <= 30 * DAY).length, file: n.rel,
    };
  });

  /* kartlar */
  const cards = T("kart").map((n) => {
    const src = by.get(link1(n.fm.kaynak) ?? "");
    const bb = str(n.fm.bekleme_bitis);
    return {
      id: n.id, idea: n.title, tema: title(link1(n.fm.tema)) || "Temasız", temaId: link1(n.fm.tema), kim: kimOf(n), kim2: link1(n.fm.ikincil_kimlik),
      taraf: str(n.fm.taraf) || "kisisel", durum: str(n.fm.durum) || "taslak",
      kalan: /^\d{4}-\d{2}-\d{2}$/.test(bb) ? Math.max(0, daysBetween(new Date(bb).getTime(), new Date(today.toISOString().slice(0, 10)).getTime())) : 0,
      bekleme: bb || null, kaynak: src ? title(src.id) : str(n.fm.kaynak) || "Belirtilmedi", kaynakId: src?.id ?? null,
      tur: str(src?.fm.kaynak_turu) || str(n.fm.tur) || "kitap", sayfa: str(n.fm.sayfa) || "—",
      fikir: bold(n.body, "Fikir") || firstPara(n.body), baglam: bold(n.body, "Bağlam"), file: n.rel,
    };
  });

  /* yetenekler */
  const skills = skillsAll.map((n) => {
    const k = Array.isArray(n.fm.kanitlar) ? (n.fm.kanitlar as Val[]) : [];
    const last = k.length ? k[k.length - 1]! : null;
    return { id: n.id, ad: str(n.fm.ad) || n.title, kim: link1(n.fm.kimlik), evre: EVRE[str(n.fm.evre)] ?? null, hedef: EVRE[str(n.fm.hedef_evre)] ?? null, kanit: k.length, son: last == null ? "—" : title(link1(last)) || str(last) };
  });

  /* öğrenme */
  const modules = T("modul").map((n) => {
    const units = section(n.body, "Birimler").split(/\r?\n/).map((l) => l.match(/^\s*(?:\d+\.|[-*])\s+(?:\[([ xX~>])\]\s*)?(.+)$/)).filter((m): m is RegExpMatchArray => !!m && !!m[2]!.trim())
      .map((m) => [m[2]!.trim(), /x/i.test(m[1] ?? "") ? 2 : /[~>]/.test(m[1] ?? "") ? 1 : 0] as [string, number]);
    const ys = links(n.fm.yetenekler);
    return {
      id: n.id, ad: str(n.fm.baslik) || n.title, kim: kimOf(n), hedef: ys.map(title).join(" · ") || "Belirlenecek", durum: MDURUM[str(n.fm.durum)] ?? (str(n.fm.durum) || "planli"),
      units, kaynak: links(n.fm.kaynaklar).map((id) => [str(by.get(id)?.fm.kaynak_turu) || "Kaynak", title(id)]), cikti: title(link1(n.fm.cikti)) || str(n.fm.cikti) || "Belirlenecek", taraf: str(n.fm.taraf) || "kisisel", file: n.rel,
    };
  });

  /* projeler — altı halka */
  const projects = T("proje").map((n) => {
    const names = (f: string) => links(n.fm[f]).map(title).join(" · ");
    const k1 = kimOf(n), k2 = link1(n.fm.ikincil_kimlik);
    const rings: [string, string, number][] = [
      ["Kavram", names("kavramlar") || "Boş: kavram bağlanmadı", isEmpty(n.fm.kavramlar) ? 0 : 1],
      ["Kimlik", [k1 && `${title(k1)} (birincil)`, k2 && title(k2)].filter(Boolean).join(" · ") || "Boş: kimlik yok", k1 ? 1 : 0],
      ["Yetenek", names("yetenekler") || "Boş: yetenek yok", isEmpty(n.fm.yetenekler) ? 0 : 1],
      ["Öğrenme", names("moduller") || "Boş: modül yok", isEmpty(n.fm.moduller) ? 0 : 1],
      ["Proje", str(n.fm.baslik) || n.title, 1],
      ["Varlık", names("varliklar") || "Boş: varlık tanımlanmadı", isEmpty(n.fm.varliklar) ? 0 : 1],
    ];
    return { id: n.id, baslik: str(n.fm.baslik) || n.title, alt: firstPara(n.body).slice(0, 140), taraf: str(n.fm.taraf) || "kisisel", durum: PDURUM[str(n.fm.durum)] ?? (str(n.fm.durum) || "fikir"), kim: k1, kim2: k2, rings, not: str(n.fm.aktarim) || (rings.some((r) => !r[2]) ? "Boş halka var; proje aktif olamaz" : ""), kesisim: str(n.fm.kesisim), file: n.rel };
  });

  /* varlıklar ve sicil */
  const cf = (n: Note) => { const v = str(n.fm.nakit_akisi_katkisi).toLowerCase(); if (/gir|in|pozitif/.test(v)) return "in"; if (/cik|çık|out|negatif/.test(v)) return "out"; return /yuksek|orta/.test(str(n.fm.degerleme_katkisi)) ? "val" : "none"; };
  const AS: Record<string, { ad: string; en: string; k: [string, string, string | null][]; s: [string, string, string | null][] }> = {
    donen: { ad: "Dönen", en: "Nakit, alacak, hisse devri", k: [], s: [] }, maddi: { ad: "Maddi", en: "CAPEX · ev, araç, kütüphane", k: [], s: [] },
    finansal: { ad: "Finansal", en: "Ortaklık, BES, yatırım aracı", k: [], s: [] }, gayri: { ad: "Gayri maddi", en: "Dijital varlık, marka, telif, alan adı", k: [], s: [] },
    entel: { ad: "Entelektüel", en: "Diploma, lisans, sertifika, yayın", k: [], s: [] },
  };
  for (const n of T("varlik")) {
    const cls = AS[SINIF[str(n.fm.varlik_sinifi)] ?? ""]; if (!cls) continue;
    const t = str(n.fm.taraf) === "ortak" ? str(n.fm.birincil_taraf) : str(n.fm.taraf);
    (t === "sirket" ? cls.s : cls.k).push([str(n.fm.ad) || n.title, cf(n), kimOf(n)]);
  }
  const sicil = T("sicil").map((n) => {
    const y = str(n.fm.yenileme);
    const left = /^\d{4}-\d{2}-\d{2}$/.test(y) ? daysBetween(new Date(y).getTime(), now) : null;
    AS.entel!.k.push([str(n.fm.ad) || n.title, "val", kimOf(n)]);
    return [str(n.fm.ad) || n.title, (str(n.fm.tur) || "kayıt").replace(/^./, (c) => c.toLocaleUpperCase("tr")), str(n.fm.kanit), y || str(n.fm.gecerlilik) || "—", left != null && left <= 90 ? left : null, kimOf(n)];
  });

  /* içerik */
  const content = T("icerik").map((n) => {
    const uy = Object.fromEntries(Object.entries((n.fm.uyum ?? {}) as Record<string, Val>).map(([k, v]) => [k, v === true ? 1 : 0]));
    const st = str(n.fm.durum) || "fikir";
    return { id: n.id, d: str(n.fm.yayin_tarihi) || null, t: str(n.fm.baslik) || n.title, ch: KANAL[str(n.fm.kanal)] ?? str(n.fm.kanal), bas: BASAMAK[str(n.fm.basamak)] ?? str(n.fm.basamak), st, kim: kimOf(n), uy, flag: ["onay", "yayinda"].includes(st) && Object.values(uy).some((x) => !x), kartlar: links(n.fm.kartlar), file: n.rel };
  });

  /* kavram evreni */
  const kav = T("kavram");
  const projKav = new Set(T("proje").flatMap((p) => links(p.fm.kavramlar)));
  const concepts = kav.map((n) => {
    const cs = cards.filter((c) => c.temaId === n.id);
    return { id: n.id, ad: n.title, n: cs.length, d: str(n.fm.eksen_disiplin), f: str(n.fm.eksen_fonksiyon), s: str(n.fm.eksen_sektor), p: projKav.has(n.id) ? 1 : 0, orphan: cs.length > 0 && cs.every((c) => !c.kim) ? 1 : 0, x: 0, y: 0 };
  });
  const cix = new Map(concepts.map((c, i) => [c.id, i]));
  const edgeSet = new Set<string>();
  const addEdge = (a: string, b: string) => { const i = cix.get(a), j = cix.get(b); if (i == null || j == null || i === j) return; edgeSet.add(i < j ? `${i},${j}` : `${j},${i}`); };
  for (const n of kav) for (const t of links(n.fm.ilgili)) addEdge(n.id, t);
  for (const g of [...T("proje"), ...T("modul")]) { const ks = links(g.fm.kavramlar); ks.forEach((a, i) => ks.slice(i + 1).forEach((b) => addEdge(a, b))); }
  const edges = [...edgeSet].map((e) => e.split(",").map(Number) as [number, number]);
  layout(concepts, edges);

  /* dört harita */
  const mapOf = (id: string) => { const n = by.get(id); if (!n) return []; return n.body.split(/^##\s+/m).slice(1).map((blk) => { const [h, ...rest] = blk.split(/\r?\n/); return [h!.trim(), rest.map((l) => l.match(/^\s*[-*]\s+(.+)$/)?.[1]).filter(Boolean).map((x) => x!.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => b || title(a)))] as [string, string[]]; }).filter((c) => c[1].length); };
  const maps = { bilim: mapOf("bilim-alanlari"), uni: mapOf("universiteler"), sirket: mapOf("sirketler"), varlik: mapOf("varliklar") };

  /* sinerji kesişimleri: proje-uretici.md içindeki "A + B → T" satırları */
  const syn: [string[], string, string][] = [];
  const lower = (s: string) => s.toLocaleLowerCase("tr");
  for (const l of (by.get("proje-uretici")?.body ?? "").split(/\r?\n/)) {
    const m = l.match(/^\s*[-*]\s+(.+?)\s*→\s*(.+)$/); if (!m) continue;
    const slugs = m[1]!.split("+").map((t) => lower(t.trim())).map((t) => ids.find((i) => lower(i.ad).includes(t) || t.includes(lower(i.ad).split(" ")[0]!))?.slug).filter((x): x is string => !!x);
    if (slugs.length < 2) continue;
    const p = projects.find((pr) => lower(pr.baslik).includes(lower(m[2]!.trim())) || lower(m[2]!).includes(lower(pr.baslik)));
    syn.push([[...new Set(slugs)], m[2]!.trim().replace(/^./, (c) => c.toLocaleUpperCase("tr")), p ? `Proje: ${p.durum} · ${p.rings.filter((r) => r[2]).length}/6 halka` : "Hipotez"]);
  }

  /* proje üretici matrisi: aynı notun tablosu (varlık sınıfı × kişisel × şirket); **kalın** → <b> */
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const matrix = (by.get("proje-uretici")?.body ?? "").split(/\r?\n/).filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => esc(c.trim()).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"))).slice(1).filter((r) => r.length >= 3) as [string, string, string][];

  /* köprü: aktarım alanı olan kayıtlar */
  const transfers = notes.filter((n) => !isEmpty(n.fm.aktarim)).map((n) => [str(n.fm.baslik) || str(n.fm.ad) || n.title, "Wisy → şirket", str(n.fm.aktarim), "Planlı"]);

  /* kimliksiz kayıtlar ve çeyreklik etkinlik */
  const noid = notes.filter((n) => ["kart", "modul", "proje", "icerik"].includes(n.type ?? "") && !kimOf(n)).map((n) => ({ id: n.id, type: n.type, t: n.title }));
  const qStart = new Date(Date.UTC(today.getUTCFullYear(), Math.floor(today.getUTCMonth() / 3) * 3, 1)).getTime();
  const pqStart = new Date(Date.UTC(today.getUTCFullYear(), Math.floor(today.getUTCMonth() / 3) * 3 - 3, 1)).getTime();
  const activity = Object.fromEntries(ids.map((i) => { const ds = records.filter((r) => kimOf(r) === i.slug).map(dateOf); return [i.slug, { q: ds.filter((d) => d >= qStart).length, pq: ds.filter((d) => d >= pqStart && d < qStart).length, kanit: skills.filter((s) => s.kim === i.slug).reduce((a, s) => a + s.kanit, 0) }]; }));

  const counts: Record<string, number> = {};
  for (const n of notes) if (n.type) counts[n.type] = (counts[n.type] ?? 0) + 1;
  return { kaynak: "kasa" as const, today: today.toISOString().slice(0, 10), ids, cards, skills, projects, modules, assets: AS, sicil, content, concepts, edges, maps, syn, matrix, transfers, noid, activity, issues, counts };
}

/** Kavram ağı: belirlenimci kuvvet yerleşimi (920×480 tuval, tasarımdaki ağ ölçüsü) */
function layout(nodes: { x: number; y: number; n: number }[], edges: [number, number][]) {
  const W = 920, H = 480, N = nodes.length; if (!N) return;
  nodes.forEach((n, i) => { const a = (i / N) * Math.PI * 2; n.x = W / 2 + Math.cos(a) * 300; n.y = H / 2 + Math.sin(a) * 160; });
  for (let it = 0; it < 220; it++) {
    const f = nodes.map(() => [0, 0]);
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const dx = nodes[i]!.x - nodes[j]!.x, dy = nodes[i]!.y - nodes[j]!.y, d2 = Math.max(dx * dx + dy * dy, 100), k = 9000 / d2;
      f[i]![0]! += dx * k / Math.sqrt(d2); f[i]![1]! += dy * k / Math.sqrt(d2); f[j]![0]! -= dx * k / Math.sqrt(d2); f[j]![1]! -= dy * k / Math.sqrt(d2);
    }
    for (const [a, b] of edges) { const dx = nodes[b]!.x - nodes[a]!.x, dy = nodes[b]!.y - nodes[a]!.y; f[a]![0]! += dx * 0.02; f[a]![1]! += dy * 0.02; f[b]![0]! -= dx * 0.02; f[b]![1]! -= dy * 0.02; }
    nodes.forEach((n, i) => { n.x += (W / 2 - n.x) * 0.01 + Math.max(-12, Math.min(12, f[i]![0]!)); n.y += (H / 2 - n.y) * 0.01 + Math.max(-12, Math.min(12, f[i]![1]!)); });
  }
  nodes.forEach((n) => { n.x = Math.round(Math.max(70, Math.min(W - 70, n.x))); n.y = Math.round(Math.max(50, Math.min(H - 50, n.y))); });
}
export type Model = ReturnType<typeof buildModel>;
