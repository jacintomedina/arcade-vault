"use server";

import { Resend } from "resend";

const CONTACT_TO = "jmedinalba+arcade@gmail.com";

const MAX_NAME = 80;
const MAX_EMAIL = 254;
const MAX_MSG = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ContactState {
  status: "idle" | "success" | "error";
  name?: string;
  error?: string;
}

const GENERIC_ERROR = "No pudimos enviar el mensaje. Inténtalo de nuevo más tarde.";

function field(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function sendContactMessage(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  // Honeypot: un bot lo rellena. Se responde éxito sin enviar nada.
  if (field(formData, "website")) {
    return { status: "success", name: field(formData, "name") };
  }

  const name = field(formData, "name");
  const email = field(formData, "email");
  const msg = field(formData, "msg");

  if (!name || !email || !msg) {
    return { status: "error", error: "Completa todos los campos." };
  }
  if (name.length > MAX_NAME) {
    return { status: "error", error: `El nombre admite máximo ${MAX_NAME} caracteres.` };
  }
  if (email.length > MAX_EMAIL || !EMAIL_RE.test(email)) {
    return { status: "error", error: "Introduce un correo electrónico válido." };
  }
  if (msg.length > MAX_MSG) {
    return { status: "error", error: `El mensaje admite máximo ${MAX_MSG} caracteres.` };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error("sendContactMessage: faltan RESEND_API_KEY o CONTACT_FROM_EMAIL");
    return { status: "error", error: GENERIC_ERROR };
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to: CONTACT_TO,
      replyTo: email,
      // Sin saltos de línea para evitar inyección en cabeceras.
      subject: `[Arcade Vault] Mensaje de ${name.replace(/\s+/g, " ")}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\n${msg}`,
    });
    if (error) {
      console.error("sendContactMessage: Resend", error);
      return { status: "error", error: GENERIC_ERROR };
    }
  } catch (err) {
    console.error("sendContactMessage:", err);
    return { status: "error", error: GENERIC_ERROR };
  }

  return { status: "success", name };
}
