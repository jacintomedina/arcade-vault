"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "./session-provider";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, account, status, logout } = useSession();
  const [openPath, setOpenPath] = useState<string | null>(null);

  // El panel móvil se cierra solo al cambiar de ruta.
  const open = openPath === pathname;
  const closeMenu = () => setOpenPath(null);

  // El juego ocupa toda la pantalla: sin barra de navegación en /games/<id>/play.
  if (/^\/games\/[^/]+\/play$/.test(pathname)) return null;

  const isHome = pathname === "/";
  const isLibrary = pathname.startsWith("/games");
  const isHall = pathname === "/hall";
  const isAbout = pathname === "/about";
  const isAccess = pathname === "/access";
  const isProfile = pathname === "/profile";
  const accountName = user?.name ?? "PERFIL";

  const handleLogout = async () => {
    closeMenu();
    await logout();
    router.push("/");
    router.refresh();
  };

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
          <Link className={isHome ? "active" : ""} href="/">
            Inicio
          </Link>
          <Link className={isLibrary ? "active" : ""} href="/games">
            Biblioteca
          </Link>
          <Link className={isHall ? "active" : ""} href="/hall">
            Salón de la Fama
          </Link>
          <Link className={isAbout ? "active" : ""} href="/about">
            Acerca de
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {account ? (
          <>
            <Link
              className={"btn ghost auth-btn" + (isProfile ? " active" : "")}
              href="/profile"
            >
              {accountName}
            </Link>
            <button className="btn ghost nav-logout" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </>
        ) : user ? (
          <button className="btn ghost auth-btn" onClick={logout}>
            {user.name} ▾
          </button>
        ) : status === "loading" ? (
          // Reserva el hueco hasta leer la sesión: sin parpadeo de «Iniciar Sesión».
          <span className="btn auth-btn auth-btn-placeholder" aria-hidden="true">
            Iniciar Sesión
          </span>
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
        <Link className={isHome ? "active" : ""} href="/" onClick={closeMenu}>
          Inicio
        </Link>
        <Link className={isLibrary ? "active" : ""} href="/games" onClick={closeMenu}>
          Biblioteca
        </Link>
        <Link className={isHall ? "active" : ""} href="/hall" onClick={closeMenu}>
          Salón de la Fama
        </Link>
        <Link className={isAbout ? "active" : ""} href="/about" onClick={closeMenu}>
          Acerca de
        </Link>
        {account ? (
          <>
            <Link className={isProfile ? "active" : ""} href="/profile" onClick={closeMenu}>
              Perfil
            </Link>
            <button type="button" className="panel-logout" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </>
        ) : (
          <Link className={isAccess ? "active" : ""} href="/access" onClick={closeMenu}>
            {user ? "Cuenta" : "Iniciar Sesión"}
          </Link>
        )}
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
