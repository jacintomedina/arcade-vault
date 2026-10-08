"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "./session-provider";

export function Nav() {
  const pathname = usePathname();
  const { user, logout } = useSession();
  const [openPath, setOpenPath] = useState<string | null>(null);

  // El panel móvil se cierra solo al cambiar de ruta.
  const open = openPath === pathname;
  const closeMenu = () => setOpenPath(null);

  const isLibrary = pathname === "/" || pathname.startsWith("/games");
  const isHall = pathname === "/hall";
  const isAccess = pathname === "/access";

  return (
    <>
      <nav className="av-nav">
        <Link className="logo" href="/">
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link className={isLibrary ? "active" : ""} href="/">
            Biblioteca
          </Link>
          <Link className={isHall ? "active" : ""} href="/hall">
            Salón de la Fama
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={logout}>
            {user.name} ▾
          </button>
        ) : (
          <Link className="btn auth-btn" href="/access">
            Iniciar Sesión
          </Link>
        )}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpenPath(pathname)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={closeMenu}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <Link className={isLibrary ? "active" : ""} href="/" onClick={closeMenu}>
          Biblioteca
        </Link>
        <Link className={isHall ? "active" : ""} href="/hall" onClick={closeMenu}>
          Salón de la Fama
        </Link>
        <Link className={isAccess ? "active" : ""} href="/access" onClick={closeMenu}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
