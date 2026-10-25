// Stüdyo ekleri — ajana gidecek biçime çevrilir. Ek bağımlılık yok:
// xlsx / docx / pptx birer zip arşividir; node:zlib ile açılıp XML'den tablo ve metin çıkarılır.
// PDF ve görseller Claude'a doğrudan belge/görsel bloğu olarak gider (API kendisi okur).
import { inflateRawSync } from "node:zlib";

export interface Upload { ad: string; tur?: string; metin?: string; b64?: string }
export type Block =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string }; title?: string };

const MAX_CHARS = 200_000;           // tek dosyadan ajana giden metin üst sınırı (~55 bin token)
const MAX_ROWS = 600, MAX_COLS = 60; // sayfa başına (dolu satır)

/* ---------------- zip ---------------- */
export function unzip(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("zip arşivi değil");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < count && buf.readUInt32LE(p) === 0x02014b50; k++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), loc = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nlen).toString("utf8");
    const start = loc + 30 + buf.readUInt16LE(loc + 26) + buf.readUInt16LE(loc + 28);
    const data = buf.subarray(start, start + csize);
    if (method === 0) out.set(name, data); else if (method === 8) out.set(name, inflateRawSync(data));
    p += 46 + nlen + elen + clen;
  }
  return out;
}

const ent = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, "&");
const texts = (xml: string, tag: string) => [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g"))].map((m) => ent(m[1]!));
const attr = (tag: string, a: string) => tag.match(new RegExp(`\\s${a}="([^"]*)"`))?.[1];
const colIx = (ref: string) => { const l = ref.match(/^[A-Z]+/)?.[0] ?? "A"; return [...l].reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1; };
const colName = (i: number) => { let s = ""; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();

/* ---------------- xlsx ---------------- */
/** Hesaplanmış ondalığı kısalt: 1234.567891 → 1234.57 (bütçe tablolarında metni yarıya indirir) */
const num = (v: string) => (/^-?\d+\.\d{3,}(E-?\d+)?$/i.test(v) ? String(Math.round(Number(v) * 100) / 100) : v);

/**
 * Sıkı biçim: yalnız dolu hücreler, satır başına tek satır — "12 | A: Reklam | C: 1500 | D: 1800".
 * Bütçe ve nakit akışı tabloları seyrek ve geniştir; Markdown tablo boş sütunlarla metni katlar.
 * Toplam sınır aşılırsa her sayfaya pay ayrılır: hiçbir sayfa (ör. varsayım sayfaları) tamamen düşmez.
 */
export function xlsxToText(buf: Buffer, budget = MAX_CHARS): string {
  const z = unzip(buf);
  const get = (n: string) => z.get(n)?.toString("utf8") ?? "";
  const shared = [...get("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]!, "t").join(""));
  const rels = new Map([...get("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)].map((m) => [attr(m[0], "Id")!, attr(m[0], "Target")!]));
  const sheets = [...get("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)].map((m) => ({ ad: ent(attr(m[0], "name") ?? "Sayfa"), hedef: rels.get(attr(m[0], "r:id") ?? "") ?? "" }));
  const parsed = sheets.map((s) => {
    const path = s.hedef.startsWith("/") ? s.hedef.slice(1) : `xl/${s.hedef.replace(/^\.\//, "")}`;
    const lines: string[] = [];
    let formul = 0;
    // boş satır kendiliğinden kapanır (<row r="2"/>); onu açılış sanmamak için iki biçim ayrı eşlenir
    for (const r of get(path).matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      if (r[2] == null) continue;
      const cells: string[] = [];
      for (const c of r[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const head = `<c${c[1]}>`, body = c[2] ?? "", t = attr(head, "t"), ref = attr(head, "r") ?? "A1";
        const v = texts(body, "v")[0];
        let val = t === "s" ? shared[Number(v)] ?? "" : t === "inlineStr" ? texts(body, "t").join("") : t === "b" ? (v === "1" ? "DOĞRU" : "YANLIŞ") : num(v ?? "");
        if (!val && /<f[\s>]/.test(body)) { formul++; continue; }
        if (val === "" || colIx(ref) >= MAX_COLS) continue;
        cells.push(`${colName(colIx(ref))}: ${cell(val)}`);
      }
      if (cells.length) lines.push(`${attr(`<r${r[1]}>`, "r") ?? lines.length + 1} | ${cells.join(" | ")}`);
    }
    return { ad: s.ad, lines: lines.slice(0, MAX_ROWS), total: lines.length, formul };
  });
  const head = [`Excel çalışma kitabı · ${sheets.length} sayfa: ${sheets.map((s) => s.ad).join(", ")}`,
    "Biçim: her satır \"satır no | sütun: değer | …\"; yalnız dolu hücreler. Sayılar hücrede kayıtlı son hesaplanmış değerdir (2 ondalık); tarih hücreleri Excel seri numarası olabilir (45658 = 2025-01-01)."];
  const size = (p: typeof parsed[number], n: number) => p.lines.slice(0, n).reduce((a, l) => a + l.length + 1, 0);
  // pay: önce her sayfa sığdığı kadar; aşarsa sayfalar arasında eşit tavan
  let cap = Math.max(...parsed.map((p) => p.lines.length), 0);
  const fits = (k: number) => parsed.reduce((a, p) => a + size(p, Math.min(k, p.lines.length)) + p.ad.length + 40, 0) <= budget;
  while (cap > 5 && !fits(cap)) cap = Math.floor(cap * 0.85);
  const out = [...head];
  for (const p of parsed) {
    const shown = Math.min(cap, p.lines.length);
    const note = [p.total > shown ? `ilk ${shown} / ${p.total} dolu satır` : `${p.total} dolu satır`, p.formul ? `${p.formul} formül hücresinde kayıtlı değer yok` : ""].filter(Boolean).join(" · ");
    out.push(`\n## Sayfa: ${p.ad} (${note})`, ...(p.lines.length ? p.lines.slice(0, shown) : ["(boş ya da yalnız grafik)"]));
  }
  return out.join("\n");
}

/* ---------------- docx / pptx ---------------- */
export function docxToText(buf: Buffer): string {
  const xml = unzip(buf).get("word/document.xml")?.toString("utf8") ?? "";
  return [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((p) => texts(p[0], "w:t").join("")).filter((x) => x.trim()).join("\n");
}
export function pptxToText(buf: Buffer): string {
  const z = unzip(buf);
  const slides = [...z.keys()].filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k)).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  return slides.map((k, i) => `## Slayt ${i + 1}\n${[...z.get(k)!.toString("utf8").matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)].map((p) => texts(p[0], "a:t").join("")).filter((x) => x.trim()).join("\n")}`).join("\n\n");
}

/* ---------------- dağıtıcı ---------------- */
const ext = (ad: string) => ad.toLowerCase().split(".").pop() ?? "";
const IMG: Record<string, "image/png" | "image/jpeg" | "image/webp" | "image/gif"> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };
const clip = (s: string) => (s.length > MAX_CHARS ? `${s.slice(0, MAX_CHARS)}\n…(kırpıldı: ${s.length.toLocaleString("tr-TR")} karakterin ilk ${MAX_CHARS.toLocaleString("tr-TR")}'i)` : s);

/** Bir eki Claude içerik bloğuna çevirir; okunamazsa nedenini metin olarak söyler (ajan uydurmasın) */
export function toBlock(f: Upload): Block {
  const e = ext(f.ad);
  if (f.metin != null) return { type: "text", text: `Ek dosya: ${f.ad}\n${clip(f.metin)}` };
  if (!f.b64) return { type: "text", text: `Ek dosya: ${f.ad} — içerik gelmedi.` };
  const buf = Buffer.from(f.b64, "base64");
  try {
    if (e === "pdf") return { type: "document", source: { type: "base64", media_type: "application/pdf", data: f.b64 }, title: f.ad };
    if (IMG[e]) return { type: "image", source: { type: "base64", media_type: IMG[e]!, data: f.b64 } };
    if (["xlsx", "xlsm"].includes(e)) return { type: "text", text: `Ek dosya: ${f.ad}\n${clip(xlsxToText(buf))}` };
    if (e === "docx") return { type: "text", text: `Ek dosya: ${f.ad}\n${clip(docxToText(buf))}` };
    if (e === "pptx") return { type: "text", text: `Ek dosya: ${f.ad}\n${clip(pptxToText(buf))}` };
    if (e === "xls" || e === "doc" || e === "ppt") return { type: "text", text: `Ek dosya: ${f.ad} — eski Office biçimi (.${e}) okunamıyor. Ferhan'dan .${e}x olarak kaydetmesini iste; içerik uydurma.` };
    return { type: "text", text: `Ek dosya: ${f.ad}\n${clip(buf.toString("utf8"))}` };
  } catch (err) {
    return { type: "text", text: `Ek dosya: ${f.ad} — okunamadı (${(err as Error).message}). İçerik uydurma; Ferhan'a dosyanın bozuk olabileceğini söyle.` };
  }
}
