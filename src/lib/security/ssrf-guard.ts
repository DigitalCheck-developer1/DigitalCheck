import dns from "node:dns/promises";
import net from "node:net";

/**
 * Protezione SSRF.
 *
 * Il server esegue richieste HTTP verso URL forniti dall'utente: questa e'
 * per definizione una superficie SSRF. Ogni funzione qui e' pensata per
 * essere chiamata PRIMA di ogni singola richiesta effettuata dal crawler
 * (inclusi i redirect, che vanno rivalidati uno per uno, non solo l'URL
 * iniziale — altrimenti un redirect e' un modo banale per bypassare il
 * controllo).
 *
 * Copre: localhost, IPv4/IPv6 private e link-local, il metadata endpoint
 * cloud (169.254.169.254), e il DNS rebinding (risolviamo il nome PRIMA
 * di connetterci e controlliamo l'IP risolto, non solo l'hostname).
 */

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);

const CLOUD_METADATA_IPS = new Set([
  "169.254.169.254", // AWS/GCP/Azure metadata
  "fd00:ec2::254", // AWS IPv6 metadata
]);

export class SsrfBlockedError extends Error {
  constructor(reason: string) {
    super(`Richiesta bloccata per protezione SSRF: ${reason}`);
    this.name = "SsrfBlockedError";
  }
}

function isIPv4Private(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + metadata
  if (a === 0) return true; // "this network"
  if (a >= 224) return true; // multicast/reserved
  return false;
}

function isIPv6Private(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true; // loopback
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local (fc00::/7)
  if (normalized.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 — estrai e ricontrolla come IPv4
    const mapped = normalized.split(":").pop() ?? "";
    if (net.isIPv4(mapped)) return isIPv4Private(mapped);
  }
  return false;
}

export function isPrivateOrReservedIp(ip: string): boolean {
  if (CLOUD_METADATA_IPS.has(ip)) return true;
  if (net.isIPv4(ip)) return isIPv4Private(ip);
  if (net.isIPv6(ip)) return isIPv6Private(ip);
  // Non un IP riconoscibile: tratta come non sicuro per default.
  return true;
}

export interface SsrfCheckResult {
  ok: boolean;
  reason?: string;
  resolvedIps?: string[];
}

/**
 * Valida un URL prima di ogni richiesta in uscita: schema, hostname
 * bloccati esplicitamente, e risoluzione DNS con controllo di TUTTI
 * gli IP risolti (un hostname puo' risolvere a piu' IP; basta che uno
 * sia privato per bloccare, per prevenire il rebinding).
 */
export async function checkUrlIsSafe(rawUrl: string): Promise<SsrfCheckResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "URL non valido" };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, reason: `Schema non consentito: ${url.protocol}` };
  }

  const hostname = url.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { ok: false, reason: "Hostname bloccato" };
  }

  // Se l'hostname e' gia' un IP letterale, valuta direttamente.
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return { ok: false, reason: "Indirizzo IP privato o riservato" };
    }
    return { ok: true, resolvedIps: [hostname] };
  }

  let addresses: string[];
  try {
    const records = await dns.lookup(hostname, { all: true, verbatim: false });
    addresses = records.map((r) => r.address);
  } catch {
    return { ok: false, reason: "Risoluzione DNS fallita" };
  }

  if (addresses.length === 0) {
    return { ok: false, reason: "Nessun indirizzo IP risolto" };
  }

  for (const ip of addresses) {
    if (isPrivateOrReservedIp(ip)) {
      return { ok: false, reason: `Uno degli IP risolti e' privato/riservato (${ip})` };
    }
  }

  return { ok: true, resolvedIps: addresses };
}

/** Convenienza: lancia se l'URL non e' sicuro. */
export async function assertUrlIsSafe(rawUrl: string): Promise<void> {
  const result = await checkUrlIsSafe(rawUrl);
  if (!result.ok) {
    throw new SsrfBlockedError(result.reason ?? "motivo sconosciuto");
  }
}
