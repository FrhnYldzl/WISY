// Uygulama durumu — SQLite (node:sqlite), VIBE Management store.ts ile aynı desen.
// Kasa (Obsidian) kaynak gerçekliktir; burada yalnız stüdyo oturumları, çıktı kütüphanesi, Claude kullanımı ve kasa yazım günlüğü durur.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export function openStore(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ajan TEXT, model TEXT NOT NULL, tier TEXT, input INTEGER NOT NULL DEFAULT 0, output INTEGER NOT NULL DEFAULT 0, usd REAL NOT NULL DEFAULT 0, durum TEXT NOT NULL DEFAULT 'ok'
    );
    -- kasaya her yazım: kim (panel / ajan), ne, hangi dosyalar
    CREATE TABLE IF NOT EXISTS journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      kaynak TEXT NOT NULL, tur TEXT NOT NULL, ozet TEXT NOT NULL, dosyalar TEXT NOT NULL, oneri TEXT
    );
  `);
  return {
    path,
    getState<T>(key: string): T | null { const r = db.prepare("SELECT json FROM state WHERE key=?").get(key) as { json: string } | undefined; return r ? JSON.parse(r.json) as T : null; },
    setState(key: string, value: unknown) { db.prepare("INSERT INTO state(key,json,updated_at) VALUES(?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(key) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at").run(key, JSON.stringify(value)); },
    addUsage(u: { ajan: string; model: string; tier: string; input: number; output: number; usd: number; durum: string }) { db.prepare("INSERT INTO usage(ajan,model,tier,input,output,usd,durum) VALUES(?,?,?,?,?,?,?)").run(u.ajan, u.model, u.tier, u.input, u.output, u.usd, u.durum); },
    usageSince(iso: string) { return db.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(usd),0) AS usd, COALESCE(SUM(input),0) AS input, COALESCE(SUM(output),0) AS output FROM usage WHERE ts>=?").get(iso) as { n: number; usd: number; input: number; output: number }; },
    usageByAgent(iso: string) { return db.prepare("SELECT ajan, COUNT(*) AS n, COALESCE(SUM(usd),0) AS usd, MAX(ts) AS son FROM usage WHERE ts>=? GROUP BY ajan").all(iso) as { ajan: string; n: number; usd: number; son: string }[]; },
    log(e: { kaynak: string; tur: string; ozet: string; dosyalar: string[]; oneri?: unknown }) { db.prepare("INSERT INTO journal(kaynak,tur,ozet,dosyalar,oneri) VALUES(?,?,?,?,?)").run(e.kaynak, e.tur, e.ozet, JSON.stringify(e.dosyalar), e.oneri ? JSON.stringify(e.oneri) : null); },
    journal(limit = 50) { return (db.prepare("SELECT * FROM journal ORDER BY id DESC LIMIT ?").all(limit) as { dosyalar: string; oneri: string | null }[]).map((r) => ({ ...r, dosyalar: JSON.parse(r.dosyalar), oneri: r.oneri ? JSON.parse(r.oneri) : null })); },
    close() { db.close(); },
  };
}
export type Store = ReturnType<typeof openStore>;
