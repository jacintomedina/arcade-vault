import type { ReactNode } from "react";

/** Marco común de las pantallas de acceso (forgot, reset, username, profile). */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h1 className="auth-title neon-cyan">{title}</h1>
          {subtitle && <p className="auth-sub">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
