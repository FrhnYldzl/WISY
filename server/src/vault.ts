// Kasa okuyucu/yazıcı — Obsidian kasası kaynak gerçekliktir (CLAUDE.md · Teknik kararlar).
// YAML frontmatter'ın kasada kullanılan alt kümesi elle ayrıştırılır (ek bağımlılık yok):
// skaler, tırnaklı metin, true/false, [] / {}, satır içi liste, "- öğe" listesi, bir seviye iç içe harita.
// Yazarken yalnızca dokunulan alanın satırları değişir; dosyanın geri kalanı birebir korunur.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

export type Val = string | boolean | null | Val[] | { [k: string]: Val };
export type FM = Record<string, Val>;
export interface Note { id: string; rel: string; dir: string; type: string | null; fm: FM; title: string; body: string; mtime: number }

const SKIP = new Set(["_sablonlar", ".obsidian", ".trash", "_silinecek"]);
const LINK = /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g;

/* ---------------- ayrıştırma ---------------- */
function scalar(raw: string): Val {
  const s = raw.trim();
  if (s === "" || s === "~" || s === "null") return null;
  if (s === "[]") return [];
  if (s === "{}") return {};
  if (s === "true") return true;
  if (s === "false") return false;
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1).replace(/\\"/g, '"');
  if (s.startsWith("[") && s.endsWith("]")) return s.slice(1, -1).split(",").map((x) => scalar(x)).filter((x) => x !== null);
  return s.replace(/\s+#.*$/, "");
}

export function parseFrontmatter(text: string): { fm: FM | null; body: string } {
  if (!text.startsWith("---")) return { fm: null, body: text };
  const end = text.indexOf("\n---", 3);
  if (end < 0) return { fm: null, body: text };
  const head = text.slice(3, end).replace(/^\r?\n/, "");
  const body = text.slice(text.indexOf("\n", end + 1) + 1);
  const lines = head.split(/\r?\n/);
  const fm: FM = {};
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i]!.match(/^([A-Za-z0-9_]+):(.*)$/);
    if (!m) continue;
    const key = m[1]!, rest = m[2]!;
    if (rest.trim() !== "") { fm[key] = scalar(rest); continue; }
    // blok: sonraki girintili satırlar
    const block: string[] = [];
    while (i + 1 < lines.length && /^(\s+\S|\s*-\s)/.test(lines[i + 1]!) && !/^[A-Za-z0-9_]+:/.test(lines[i + 1]!)) block.push(lines[++i]!);
    if (!block.length) { fm[key] = null; continue; }
    if (block[0]!.trim().startsWith("- ") || block[0]!.trim() === "-") fm[key] = block.map((b) => scalar(b.trim().replace(/^-\s?/, ""))).filter((x) => x !== null);
    else {
      const map: Record<string, Val> = {};
      for (const b of block) { const mm = b.trim().match(/^([A-Za-z0-9_]+):(.*)$/); if (mm) map[mm[1]!] = scalar(mm[2]!); }
      fm[key] = map;
    }
  }
  return { fm, body };
}

export const links = (v: Val | undefined): string[] => {
  if (v == null || typeof v === "boolean") return [];
  if (Array.isArray(v)) return v.flatMap(links);
  if (typeof v === "object") return [];
  return [...String(v).matchAll(LINK)].map((m) => m[1]!.trim());
};
export const link1 = (v: Val | undefined): string | null => links(v)[0] ?? null;
export const isEmpty = (v: Val | undefined) => v == null || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.keys(v as object).length);
export const str = (v: Val | undefined): string => (v == null || typeof v === "object" ? "" : String(v));

/* ---------------- okuma ---------------- */
export class Vault {
  constructor(public root: string) {}
  private cache: { at: number; notes: Note[] } | null = null;

  private walk(dir: string, out: string[] = []): string[] {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) { if (!SKIP.has(e.name)) this.walk(join(dir, e.name), out); }
      else if (e.name.endsWith(".md")) out.push(join(dir, e.name));
    }
    return out;
  }
  /** Tüm notlar (1 sn önbellek — panel ardışık istekte diski tekrar taramasın) */
  notes(): Note[] {
    if (this.cache && Date.now() - this.cache.at < 1000) return this.cache.notes;
    const notes = this.walk(this.root).map((p) => this.read(p));
    this.cache = { at: Date.now(), notes };
    return notes;
  }
  invalidate() { this.cache = null; }
  private read(path: string): Note {
    const text = readFileSync(path, "utf-8");
    const { fm, body } = parseFrontmatter(text);
    const rel = relative(this.root, path).split(sep).join("/");
    const id = rel.split("/").pop()!.replace(/\.md$/, "");
    const title = body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? id;
    return { id, rel, dir: rel.split("/")[0]!, type: fm ? str(fm.type) || null : null, fm: fm ?? {}, title, body, mtime: statSync(path).mtimeMs };
  }
  byId(): Map<string, Note> { return new Map(this.notes().map((n) => [n.id, n])); }
  get(id: string): Note | undefined { return this.byId().get(id); }
  abs(rel: string) { const p = join(this.root, rel); if (relative(this.root, p).startsWith("..")) throw new Error("Kasa dışı yol"); return p; }

  /* ---------------- yazma ---------------- */
  /** Yeni not: var olan dosyanın üzerine yazmaz (ajanlar silmez/ezmez — CLAUDE.md kural 8) */
  create(rel: string, fm: FM, body: string): Note {
    const p = this.abs(rel);
    if (existsSync(p)) throw Object.assign(new Error(`${rel} zaten var`), { statusCode: 409 });
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, `---\n${serializeFM(fm)}---\n\n${body.trim()}\n`, "utf-8");
    this.invalidate();
    return this.get(rel.split("/").pop()!.replace(/\.md$/, ""))!;
  }
  /** Tek alan güncelle: yalnız o alanın satırları değişir */
  setField(id: string, key: string, value: Val): Note {
    const n = this.get(id); if (!n) throw Object.assign(new Error(`Not yok: ${id}`), { statusCode: 404 });
    const p = this.abs(n.rel);
    writeFileSync(p, replaceField(readFileSync(p, "utf-8"), key, value), "utf-8");
    this.invalidate();
    return this.get(id)!;
  }
  /** Silme yerine _silinecek/ klasörüne taşıma (docs/06 · Veri ve gizlilik) */
  retire(id: string): string {
    const n = this.get(id); if (!n) throw Object.assign(new Error(`Not yok: ${id}`), { statusCode: 404 });
    const to = `_silinecek/${n.id}.md`;
    mkdirSync(join(this.root, "_silinecek"), { recursive: true });
    renameSync(this.abs(n.rel), this.abs(to));
    this.invalidate();
    return to;
  }
}

/* ---------------- serileştirme ---------------- */
const needsQuote = (s: string) => s === "" || /^[\[{'"!&*#?|>%@`-]|: |\s#|^(true|false|null|~)$/i.test(s) || s.includes("[[");
const q = (s: string) => (needsQuote(s) ? `"${s.replace(/"/g, '\\"')}"` : s);
function serVal(key: string, v: Val): string {
  if (v === null || v === undefined) return `${key}:\n`;
  if (typeof v === "boolean") return `${key}: ${v}\n`;
  if (Array.isArray(v)) return v.length ? `${key}:\n${v.map((x) => `  - ${q(String(x))}`).join("\n")}\n` : `${key}: []\n`;
  if (typeof v === "object") {
    const e = Object.entries(v);
    return e.length ? `${key}:\n${e.map(([k, x]) => `  ${k}: ${typeof x === "boolean" ? x : x == null ? "" : q(String(x))}`.trimEnd()).join("\n")}\n` : `${key}: {}\n`;
  }
  return `${key}: ${q(String(v))}\n`;
}
export const serializeFM = (fm: FM) => Object.entries(fm).map(([k, v]) => serVal(k, v)).join("");

export function replaceField(text: string, key: string, value: Val): string {
  const nl = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "---") throw new Error("Frontmatter yok");
  const close = lines.indexOf("---", 1);
  const at = lines.findIndex((l, i) => i > 0 && i < close && new RegExp(`^${key}:`).test(l));
  const repl = serVal(key, value).replace(/\n$/, "").split("\n");
  if (at < 0) lines.splice(close, 0, ...repl);
  else {
    let end = at + 1;
    while (end < close && /^(\s+\S|\s*-\s)/.test(lines[end]!) && !/^[A-Za-z0-9_]+:/.test(lines[end]!)) end++;
    lines.splice(at, end - at, ...repl);
  }
  return lines.join(nl);
}

/** Türkçe başlık → ASCII dosya adı (CLAUDE.md · Dil) */
export function slugify(s: string, max = 60): string {
  const map: Record<string, string> = { ç: "c", ş: "s", ğ: "g", ı: "i", ö: "o", ü: "u", Ç: "c", Ş: "s", Ğ: "g", İ: "i", Ö: "o", Ü: "u", â: "a", î: "i", û: "u" };
  return s.replace(/[çşğıöüÇŞĞİÖÜâîû]/g, (c) => map[c]!).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max).replace(/-+$/, "") || "not";
}
