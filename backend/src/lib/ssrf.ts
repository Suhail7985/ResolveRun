import dns from "node:dns/promises";
import { URL } from "node:url";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
]);

function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") return true;
  if (ip.startsWith("127.")) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  const parts = ip.split(".");
  if (parts.length === 4 && parts[0] === "172") {
    const second = Number(parts[1]);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  return false;
}

export async function validateOutboundUrl(rawUrl: string): Promise<void> {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost")) {
    throw new Error("Target host is not allowed");
  }
  if (host === "169.254.169.254") {
    throw new Error("Cloud metadata endpoints are blocked");
  }
  let addresses: string[];
  try {
    const lookedUp = await dns.lookup(host, { all: true, verbatim: true });
    addresses = lookedUp.map((a) => a.address);
  } catch {
    throw new Error("Unable to resolve target host");
  }
  for (const addr of addresses) {
    if (isPrivateIp(addr)) {
      throw new Error("Target resolves to a private or local address");
    }
  }
}
