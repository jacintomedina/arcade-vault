import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

// Hash de la IP del cliente para limitar el ritmo de creación de sesiones sin
// guardar la IP en claro. `x-forwarded-for` solo es fiable detrás de un proxy
// de confianza (Vercel); sin él, el cliente puede falsearla. IP_HASH_SALT es
// un secreto de servidor (ver .env.template).
export async function getIpHash(): Promise<string | null> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    null;
  if (!ip) return null;
  return createHash("sha256")
    .update(`${process.env.IP_HASH_SALT ?? ""}:${ip}`)
    .digest("hex");
}
