import { randomBytes, createHash } from "node:crypto";

// Il token in chiaro viene inviato via email e mai salvato; nel database
// finisce solo il suo hash, cosi' un dump del DB non permette di
// impersonare l'utente riusando il link.
export function generateToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenExpiry(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
