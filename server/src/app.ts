// Wisy tek servis:  /  panel (public/)  ·  /api/*  kasa modeli, öneri uygulama, ajan orkestratörü, stüdyo durumu.
// Kasa kişisel veridir (docs/06 · Veri ve gizlilik): yerelde yalnız 127.0.0.1, dağıtımda parola zorunlu (auth.ts).
// Claude anahtarı yalnız WISY_MANAGEMENT'dir; genel ANTHROPIC_API_KEY bilerek okunmaz (başka projenin anahtarıyla karışmasın).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { z } from "zod";
import { contextFor, extractProposals, loadAgents, SOURCES, systemFor } from "./agents.ts";
import { Writer } from "./apply.ts";
import { buildModel } from "./model.ts";
import { check, loadSchema } from "./rules.ts";
import { openStore, type Store } from "./store.ts";
import { type AuthConfig, authFromEnv, registerAuth } from "./auth.ts";
import { str, Vault } from "./vault.ts";

const VERSION = (JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "package.json"), "utf-8")) as { version: string }).version;

export const TIER = { quick: "claude-haiku-5-5", default: "claude-opus-5-5", complex: "claude-fable-5-1" } as const;
type Tier = keyof typeof TIER;
/** USD / milyon token — platform.claude.com/docs/en/about-claude/pricing (22.10.2026'da okundu). Fiyat değişirse yalnız burası güncellenir. */
const PRICES: Record<string, { in: number; out: number }> = { "claude-fable-5-1": { in: 10, out: 50 }, "claude-opus-5-5": { in: 4, out: 20 }, "claude-sonnet-5-5": { in: 2, out: 10 }, "claude-haiku-5-5": { in: 0.1, out: 0.5 } };
const MAX_TOKENS: Record<Tier, number> = { quick: 4000, default: 12000, complex: 24000 };
const cost = (model: string, i: number, o: number) => { const p = PRICES[model]; return p ? (i * p.in + o * p.out) / 1e6 : 0; };
const monthStart = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString(); };

export interface AppOpts { root: string; vaultPath?: string; dataPath?: string; logger?: boolean; client?: Pick<Anthropic, "messages"> | null; auth?: AuthConfig }

export function buildApp({ root, vaultPath, dataPath, logger = false, client, auth = authFromEnv() }: AppOpts) {
  const app = Fastify({ logger, bodyLimit: 2_000_000, trustProxy: true }); // Railway vekil sunucusu → x-forwarded-proto
  registerAuth(app, auth);
  const vault = new Vault(vaultPath ?? process.env.WISY_VAULT ?? join(root, "vault"));
  if (!existsSync(vault.root)) throw new Error(`Kasa bulunamadı: ${vault.root} (WISY_VAULT ile yol verin)`);
  const schema = loadSchema(join(root, "schema", "entities.yaml"));
  const writer = new Writer(vault, schema);
  const store: Store = openStore(dataPath ?? process.env.WISY_DATA ?? join(root, "var", "wisy.db"));
  const budget = Number(process.env.WISY_AYLIK_TAVAN_USD) || 30;
  let anthropic: Pick<Anthropic, "messages"> | null | undefined = client;
  const apiKey = process.env.WISY_MANAGEMENT || "";
  const claude = () => (anthropic ??= apiKey ? new Anthropic({ apiKey }) : null);
  const hasClaude = Boolean(apiKey || client);
  app.addHook("onClose", async () => store.close());

  const model = () => {
    const notes = vault.notes();
    return { ...buildModel(notes, check(notes, schema)), kaynaklar: notes.filter((n) => n.type === "kaynak").map((n) => ({ id: n.id, baslik: str(n.fm.baslik) || n.title, tur: str(n.fm.kaynak_turu) })) };
  };

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof z.ZodError) return reply.status(400).send({ hata: "Geçersiz istek", ayrinti: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
    const e = err as { statusCode?: number; message?: string };
    if ((e.statusCode ?? 500) >= 500) app.log.error(err);
    return reply.status(e.statusCode ?? 500).send({ hata: e.message ?? "Sunucu hatası" });
  });

  // sağlık: oturumsuz açık (Railway denetimi); kasa yolu ya da not içeriği vermez
  app.get("/api/health", async () => ({ ok: true, surum: VERSION, commit: (process.env.RAILWAY_GIT_COMMIT_SHA ?? "").slice(0, 7) || null, notlar: vault.notes().length, claude: hasClaude, giris: auth.enabled ? "açık" : "kapalı" }));
  app.get("/api/model", async () => model());
  app.get("/api/issues", async () => check(vault.notes(), schema));

  /* ---- kasaya yazım: panel eylemleri ve kabul edilen ajan önerileri ---- */
  app.post("/api/vault/apply", async (req) => {
    const b = z.object({ oneri: z.unknown(), kaynak: z.string().max(60).default("panel") }).parse(req.body);
    const r = writer.apply(b.oneri);
    store.log({ kaynak: b.kaynak, tur: (b.oneri as { tur?: string })?.tur ?? "?", ozet: r.ozet, dosyalar: r.yazilan, oneri: b.oneri });
    return r;
  });
  app.get("/api/vault/journal", async () => store.journal(80));

  /* ---- ajanlar ---- */
  const defs = () => loadAgents(root);
  app.get("/api/agents", async () => {
    const { agents, flows } = defs();
    const use = Object.fromEntries(store.usageByAgent(monthStart()).map((u) => [u.ajan, u]));
    return { agents: agents.map(({ govde: _g, ...a }) => ({ ...a, kullanim: use[a.id] ?? null })), flows, sources: SOURCES, claude: hasClaude, tiers: TIER };
  });

  const RunBody = z.object({
    ajan: z.string(), gorev: z.string().min(1).max(20000), kim: z.string().nullable().optional(), kaynaklar: z.array(z.enum(SOURCES)).optional(),
    gecmis: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).max(40).default([]), onceki: z.string().max(40000).optional(),
    tier: z.enum(["quick", "default", "complex"]).default("default"), dosyalar: z.array(z.object({ ad: z.string(), metin: z.string().max(200000) })).max(8).default([]),
  });
  app.post("/api/agents/run", async (req, reply) => {
    const b = RunBody.parse(req.body);
    const { agents } = defs();
    const agent = agents.find((a) => a.id === b.ajan); if (!agent) return reply.status(404).send({ hata: `Ajan yok: ${b.ajan}` });
    const c = claude(); if (!c) return reply.status(503).send({ hata: "WISY_MANAGEMENT tanımlı değil — .env (yerel) ya da Railway Variables içine ekleyin." });
    const spent = store.usageSince(monthStart()).usd;
    if (budget > 0 && spent >= budget) return reply.status(402).send({ hata: `Aylık bütçe doldu ($${spent.toFixed(2)} / $${budget}). WISY_AYLIK_TAVAN_USD ile artırın.` });
    const m = model();
    const ctx = contextFor(m, b.kaynaklar ?? agent.kaynaklar, b.kim, { kaynaklar: m.kaynaklar });
    const system = `${systemFor(root, agent, agents)}\n\n## Kasa bağlamı${b.kim ? ` (kapsam: ${b.kim})` : ""}\n\`\`\`json\n${JSON.stringify(ctx)}\n\`\`\``;
    const user = [b.onceki ? `Önceki adımın çıktısı (akış):\n${b.onceki}` : "", ...b.dosyalar.map((f) => `Ek dosya: ${f.ad}\n${f.metin}`), b.gorev].filter(Boolean).join("\n\n---\n\n");
    const modelId = TIER[b.tier];
    reply.raw.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    const send = (o: unknown) => reply.raw.write(`data: ${JSON.stringify(o)}\n\n`);
    try {
      const stream = c.messages.stream({ model: modelId, max_tokens: MAX_TOKENS[b.tier], system, messages: [...b.gecmis, { role: "user", content: user }] });
      let text = "";
      stream.on("text", (d) => { text += d; send({ delta: d }); });
      const fin = await stream.finalMessage();
      const usd = cost(modelId, fin.usage.input_tokens, fin.usage.output_tokens);
      store.addUsage({ ajan: agent.id, model: modelId, tier: b.tier, input: fin.usage.input_tokens, output: fin.usage.output_tokens, usd, durum: fin.stop_reason === "max_tokens" ? "kesildi" : "ok" });
      if (fin.stop_reason === "max_tokens") send({ truncated: true });
      send({ ...extractProposals(text) });
      send({ usage: { model: modelId, tier: b.tier, input: fin.usage.input_tokens, output: fin.usage.output_tokens, usd, ayUsd: spent + usd, tavanUsd: budget } });
      reply.raw.write("data: [DONE]\n\n");
    } catch (e) {
      send({ error: e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : String((e as Error).message ?? e) });
    }
    reply.raw.end();
    return reply;
  });

  /* hızlı kart: Haritacı + Kimlik yönlendirici tek kısa çağrı (Haiku); anahtar yoksa panel yerel eşleştirmeye düşer */
  app.post("/api/agents/suggest", async (req, reply) => {
    const b = z.object({ fikir: z.string().min(4).max(2000), kaynak: z.string().max(200).optional() }).parse(req.body);
    const c = claude(); if (!c) return reply.status(503).send({ hata: "Claude bağlı değil" });
    const m = model();
    const prompt = `Wisy hızlı kart. Fikir: "${b.fikir}"${b.kaynak ? ` · Kaynak: ${b.kaynak}` : ""}\n\nKimlikler: ${JSON.stringify(m.ids.map((i) => ({ id: i.slug, ad: i.ad, soru: i.soru })))}\nKavramlar: ${JSON.stringify(m.concepts.map((k) => ({ id: k.id, ad: k.ad })))}\n\nYalnız JSON döndür: {"tema": "<var olan kavram id'si ya da yeni kavram adı>", "tema_yeni": true|false, "kimlik": "<kimlik id>", "alternatif": "<ikinci aday kimlik id ya da null>", "belirsiz": true|false, "gerekce": "<tek cümle>"}. İki kimlik eşit uyuyorsa belirsiz=true.`;
    const r = await c.messages.create({ model: TIER.quick, max_tokens: 400, messages: [{ role: "user", content: prompt }] });
    const text = r.content.map((x) => (x.type === "text" ? x.text : "")).join("");
    store.addUsage({ ajan: "kimlik-yonlendirici", model: TIER.quick, tier: "quick", input: r.usage.input_tokens, output: r.usage.output_tokens, usd: cost(TIER.quick, r.usage.input_tokens, r.usage.output_tokens), durum: "ok" });
    try { return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? text); } catch { return reply.status(502).send({ hata: "Öneri okunamadı" }); }
  });

  /* ---- stüdyo durumu: oturumlar ve çıktı kütüphanesi ---- */
  const KEYS = z.enum(["sessions", "library"]);
  app.get<{ Params: { key: string } }>("/api/state/:key", async (req) => ({ value: store.getState(KEYS.parse(req.params.key)) ?? [] }));
  app.put<{ Params: { key: string } }>("/api/state/:key", async (req) => {
    const key = KEYS.parse(req.params.key);
    const value = z.array(z.record(z.string(), z.unknown())).max(1000).parse(req.body);
    store.setState(key, value);
    return { ok: true, adet: value.length };
  });
  app.get("/api/usage", async () => ({ ay: store.usageSince(monthStart()), tavanUsd: budget, ajan: store.usageByAgent(monthStart()) }));

  app.register(fastifyStatic, { root: join(root, "public"), prefix: "/" });
  return app;
}
