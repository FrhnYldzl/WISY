import { cpSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildApp } from "./app.ts";

const ROOT = join(import.meta.dirname, "..", "..");
// yerelde wisy/.env (git dışı); Railway'de Variables zaten ortamda
try { process.loadEnvFile(join(ROOT, ".env")); } catch { /* .env yoksa sorun değil */ }

// Dağıtımda kasa kalıcı diskte durur (WISY_VAULT=/data/vault). İlk açılışta boşsa depodaki vault/ tohum olarak kopyalanır;
// sonra kasa yalnız orada yaşar — yeniden dağıtım kayıtları ezmez.
const vault = process.env.WISY_VAULT;
if (vault && (!existsSync(vault) || readdirSync(vault).length === 0)) {
  cpSync(join(ROOT, "vault"), vault, { recursive: true });
  console.log(`Kasa tohumlandı: ${vault}`);
}

const app = buildApp({ root: ROOT, logger: true });
// Railway PORT verir ve dışarıdan erişim için 0.0.0.0 ister; yerelde yalnız bu bilgisayar (127.0.0.1:8788)
const port = Number(process.env.PORT ?? process.env.WISY_PORT ?? 8788);
const host = process.env.WISY_HOST ?? (process.env.PORT ? "0.0.0.0" : "127.0.0.1");
app.listen({ port, host }).then(() => app.log.info(`Wisy → http://localhost:${port}`)).catch((err) => { app.log.error(err); process.exit(1); });
