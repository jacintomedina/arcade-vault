import type { Metadata } from "next";
import {
  HighlightIcon,
  type HighlightIconKind,
} from "../_components/about/highlight-icon";
import { RevealObserver } from "../_components/home/reveal-observer";

export const metadata: Metadata = {
  title: "Acerca de",
  description: "Qué es Arcade Vault y cómo contactarnos.",
};

const HIGHLIGHTS: { icon: HighlightIconKind; text: string; color: string }[] = [
  { icon: "HEART", text: "HECHO CON ❤️ PARA JUGADORES", color: "magenta" },
  { icon: "BROWSER", text: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR", color: "cyan" },
  { icon: "PLANT", text: "PROYECTO EN CONSTANTE CRECIMIENTO", color: "green" },
];

export default function AboutPage() {
  return (
    <div className="about fade-in">
      <RevealObserver />

      {/* ABOUT */}
      <section className="about-hero">
        <div className="kicker pixel neon-yellow">▸ ACERCA DE</div>
        <h1 className="about-title">ACERCA DE ARCADE VAULT</h1>
        <p className="about-mission">
          ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra misión es preservar y celebrar
          los arcades que definieron una generación, haciéndolos accesibles para todos, en cualquier lugar
          y sin costo.
        </p>

        <div className="highlight-row">
          {HIGHLIGHTS.map((h, i) => (
            <div key={h.icon} className={"highlight " + h.color} style={{ transitionDelay: i * 80 + "ms" }}>
              <HighlightIcon kind={h.icon} />
              <div className="hl-text pixel">{h.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* divider banner */}
      <div className="about-divider reveal" aria-hidden="true">
        <div className="div-bar"></div>
        <div className="div-pixels">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} style={{ animationDelay: i * 80 + "ms" }}></span>
          ))}
        </div>
        <div className="div-bar"></div>
      </div>

      {/* CONTACT */}
      <section className="about-contact reveal">
        <div className="contact-grid">
          <div className="contact-intro">
            <div className="kicker pixel neon-cyan">▸ CONTACTO</div>
            <h2 className="contact-title">CONTÁCTANOS</h2>
            <p className="contact-sub">
              ¿Tienes alguna sugerencia, quieres proponer un juego, o simplemente quieres saludar?
              Escríbenos.
            </p>
            <div className="contact-tips">
              <div className="tip"><span className="tip-led"></span>RESPUESTA EN 24-48H</div>
              <div className="tip"><span className="tip-led y"></span>SUGERENCIAS BIENVENIDAS</div>
              <div className="tip"><span className="tip-led m"></span>SIN SPAM, JAMÁS</div>
            </div>
          </div>

          {/* Formulario estático; se reemplaza por contact-form.tsx en el paso 5 */}
          <form className="contact-form">
            <div className="field">
              <label htmlFor="name">NOMBRE</label>
              <input id="name" name="name" placeholder="px_kai" />
            </div>
            <div className="field">
              <label htmlFor="email">CORREO ELECTRÓNICO</label>
              <input id="email" name="email" type="email" placeholder="jugador@vault.gg" />
            </div>
            <div className="field">
              <label htmlFor="msg">MENSAJE</label>
              <textarea id="msg" name="msg" rows={5} placeholder="Cuéntanos qué tienes en mente…"></textarea>
            </div>
            <button className="btn xl press" type="submit" style={{ width: "100%" }}>
              ▶  ENVIAR MENSAJE
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
