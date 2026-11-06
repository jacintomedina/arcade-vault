import "server-only";
import { headers } from "next/headers";

// Origen público para los enlaces de auth (confirmación, OAuth, recuperación).
// En producción sale solo de SITE_URL: nunca de cabeceras que el cliente controla.
// En desarrollo se deriva de la petición para poder probar desde el móvil (LAN).
export async function getSiteUrl(): Promise<string | null> {
  const fixed = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (fixed) return fixed;
  if (process.env.NODE_ENV !== "development") return null;

  const h = await headers();
  const host = h.get("host");
  if (!host) return null;
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
