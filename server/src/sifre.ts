// Parola özeti üretir: npm run sifre -- "<parola>"  →  WISY_PASSWORD_HASH değeri
import { hashPassword } from "./auth.ts";

const pw = process.argv[2];
if (!pw || pw.length < 10) { console.error("Kullanım: npm run sifre -- \"<en az 10 karakterlik parola>\""); process.exit(1); }
console.log(hashPassword(pw));
