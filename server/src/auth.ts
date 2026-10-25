// Giriş koruması — kasa kişisel veridir. Tek kullanıcı, tek parola.
// WISY_PASSWORD_HASH (npm run sifre -- <parola> ile üretilir) + WISY_SESSION_SECRET tanımlıysa açık.
// NODE_ENV=production iken ikisi de yoksa sunucu başlamaz (kasa parolasız internete çıkmaz).
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface AuthConfig { enabled: boolean; hash: string; secret: string; days: number }
const COOKIE = "wisy_oturum";
const OPEN = new Set(["/api/health", "/giris", "/cikis"]);

export function authFromEnv(env = process.env): AuthConfig {
  const hash = env.WISY_PASSWORD_HASH ?? "", secret = env.WISY_SESSION_SECRET ?? "";
  const enabled = Boolean(hash && secret);
  if (env.NODE_ENV === "production" && !enabled) throw new Error("Dağıtımda giriş zorunlu: WISY_PASSWORD_HASH ve WISY_SESSION_SECRET tanımlayın.");
  if ((hash || secret) && !enabled) throw new Error("WISY_PASSWORD_HASH ve WISY_SESSION_SECRET birlikte tanımlanmalı.");
  return { enabled, hash, secret, days: Number(env.WISY_SESSION_DAYS) || 14 };
}

/** scrypt:<tuz hex>:<özet hex> */
export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString("hex")}:${scryptSync(pw, salt, 32).toString("hex")}`;
}
export function verifyPassword(pw: string, stored: string): boolean {
  const [alg, salt, hex] = stored.split(":");
  if (alg !== "scrypt" || !salt || !hex) return false;
  const a = scryptSync(pw, Buffer.from(salt, "hex"), 32), b = Buffer.from(hex, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
const sign = (secret: string, v: string) => createHmac("sha256", secret).update(v).digest("base64url");
function token(cfg: AuthConfig) { const exp = String(Date.now() + cfg.days * 86400000); return `${exp}.${sign(cfg.secret, exp)}`; }
function valid(cfg: AuthConfig, t: string | undefined) {
  if (!t) return false;
  const [exp, sig] = t.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const want = Buffer.from(sign(cfg.secret, exp)), got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}
const cookieOf = (req: FastifyRequest) => Object.fromEntries((req.headers.cookie ?? "").split(";").map((c) => c.trim().split("=")).filter((p) => p[0]).map(([k, ...v]) => [k, v.join("=")]))[COOKIE];

export function registerAuth(app: FastifyInstance, cfg: AuthConfig) {
  app.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string" }, (_r, body, done) => done(null, Object.fromEntries(new URLSearchParams(body as string))));
  if (!cfg.enabled) return;
  const setCookie = (req: FastifyRequest, reply: FastifyReply, value: string, maxAge: number) =>
    reply.header("set-cookie", `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${req.protocol === "https" ? "; Secure" : ""}`);

  app.addHook("onRequest", async (req, reply) => {
    const path = req.url.split("?")[0]!;
    if (OPEN.has(path) || valid(cfg, cookieOf(req))) return;
    if (path.startsWith("/api/")) return reply.status(401).send({ hata: "Oturum gerekli" });
    return reply.redirect("/giris");
  });
  app.get("/giris", async (req, reply) => reply.type("text/html").send(loginPage((req.query as { h?: string }).h === "1", cfg.days)));
  app.post("/giris", async (req, reply) => {
    const pw = String((req.body as { parola?: string } | null)?.parola ?? "");
    if (!verifyPassword(pw, cfg.hash)) { await new Promise((r) => setTimeout(r, 600)); return reply.redirect("/giris?h=1"); }
    setCookie(req, reply, token(cfg), cfg.days * 86400);
    return reply.redirect("/");
  });
  app.post("/cikis", async (req, reply) => { setCookie(req, reply, "", 0); return reply.redirect("/giris"); });
}

/* Giriş sayfası: omurga token'ları (lacivert ray, kâğıt zemin, Wisy deniz yeşili, Playfair + Inter) */
function loginPage(err: boolean, days: number) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wisy · Giriş</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;1,500&family=Inter:wght@400;600&family=JetBrains+Mono&display=swap">
<style>
:root{--navy:#0A2240;--bg:#FAFAF7;--elev:#fff;--ink:#0A2240;--ink3:rgba(10,34,64,.52);--line:rgba(10,34,64,.18);--wisy:#0E6B68;--mark:#12807A;--red:#8A1F1D;--meridian:rgba(14,107,104,.07)}
@media (prefers-color-scheme:dark){:root{--bg:#060F1F;--elev:#0D1B33;--ink:#F2F0EA;--ink3:rgba(242,240,234,.5);--line:rgba(255,255,255,.16);--wisy:#4FB7AA;--red:#E26B68;--meridian:rgba(79,183,170,.07)}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg) repeating-linear-gradient(90deg,var(--meridian) 0 1px,transparent 1px 48px);color:var(--ink);font:14px/1.5 Inter,system-ui,sans-serif;padding:16px}
form{width:min(380px,100%);background:var(--elev);border:1px solid var(--line);border-radius:14px;padding:28px}
.b{display:flex;gap:12px;align-items:center;margin-bottom:22px}.m{width:34px;height:34px;border-radius:9px;background:var(--mark);color:#fff;display:grid;place-items:center;font:600 15px "Playfair Display",serif}
.n{font:500 21px "Playfair Display",serif;line-height:1}.s{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);margin-top:4px}
h1{font:500 26px/1.15 "Playfair Display",serif;margin:0 0 6px}h1 em{color:var(--wisy)}p{margin:0 0 18px;color:var(--ink3)}
label{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);font-weight:600;margin-bottom:6px}
input{width:100%;height:38px;border:1px solid var(--line);border-radius:6px;background:transparent;color:inherit;padding:0 10px;font:inherit;outline:0}input:focus{border-color:var(--wisy)}
button{margin-top:16px;width:100%;height:36px;border:0;border-radius:6px;background:var(--wisy);color:#fff;font:600 13px Inter,sans-serif;cursor:pointer}
.e{color:var(--red);font-size:12.5px;margin-top:10px}.f{font:11px "JetBrains Mono",monospace;color:var(--ink3);margin-top:18px}
</style></head><body><form method="post" action="/giris">
<div class="b"><div class="m">W</div><div><div class="n">Wisy</div><div class="s">Kişisel merkez</div></div></div>
<h1>Kasa <em>kilitli</em></h1><p>Kişisel kasa. Devam etmek için parolanı gir.</p>
<label for="p">Parola</label><input id="p" name="parola" type="password" autocomplete="current-password" autofocus required>
${err ? '<div class="e">Parola yanlış.</div>' : ""}<button type="submit">Giriş</button><div class="f">Oturum ${days} gün açık kalır.</div>
</form></body></html>`;
}
