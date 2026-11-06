"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { signOutAction } from "../access/actions";
import { createClient } from "../_lib/supabase/client";

export interface SessionUser {
  name: string;
}

export interface SessionAccount {
  id: string;
  email: string;
  username: string | null;
}

interface SessionContextValue {
  /** Nombre visible: username de la cuenta (mayúsculas) o invitado local. */
  user: SessionUser | null;
  /** Cuenta de Supabase; null si no hay sesión o aún no se ha leído. */
  account: SessionAccount | null;
  /** "loading" hasta que termina la primera lectura tras montar. */
  status: "loading" | "ready";
  /** Solo invitado (localStorage). */
  login: (user: SessionUser) => void;
  /** Cierra la sesión de Supabase si hay cuenta y limpia el invitado. */
  logout: () => Promise<void>;
  /** Vuelve a leer cuenta y perfil (p. ej. tras cambiar el username). */
  refresh: () => Promise<void>;
}

const STORAGE_KEY = "av_user";

const SessionContext = createContext<SessionContextValue | null>(null);

function readStoredUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as SessionUser).name === "string" &&
      (parsed as SessionUser).name.length > 0
    ) {
      return { name: (parsed as SessionUser).name };
    }
  } catch {
    // localStorage bloqueado o JSON corrupto: invitado
  }
  return null;
}

async function readAccount(): Promise<SessionAccount | null> {
  try {
    const supabase = createClient();
    // getUser valida el JWT contra Supabase (getSession solo lee la cookie).
    const { data } = await supabase.auth.getUser();
    const authUser = data.user;
    if (!authUser) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", authUser.id)
      .maybeSingle();
    return {
      id: authUser.id,
      email: authUser.email ?? "",
      username: profile?.username ?? null,
    };
  } catch {
    // Configuración de Supabase inválida o sin red: se trata como sin cuenta.
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  // Servidor y primer render del cliente: sin sesión. Se lee tras montar.
  const [guest, setGuest] = useState<SessionUser | null>(null);
  const [account, setAccount] = useState<SessionAccount | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única tras montar, evita desajuste de hidratación
    setGuest(readStoredUser());

    let active = true;
    const load = async () => {
      const next = await readAccount();
      if (!active) return;
      setAccount(next);
      setStatus("ready");
    };
    void load();

    let unsubscribe: (() => void) | undefined;
    try {
      const { data } = createClient().auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          setAccount(null);
        } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          // Fuera del callback: Supabase desaconseja llamar a su API dentro de él.
          setTimeout(() => void load(), 0);
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      // Sin Supabase: solo invitado.
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const login = useCallback((next: SessionUser) => {
    const clean: SessionUser = { name: next.name.trim().toUpperCase().slice(0, 10) };
    setGuest(clean);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // sin persistencia
    }
  }, []);

  const logout = useCallback(async () => {
    // Las cookies de sesión las borra el servidor; después se limpia el
    // estado local del cliente de navegador.
    if (account) {
      await signOutAction();
      try {
        await createClient().auth.signOut({ scope: "local" });
      } catch {
        // ya cerrada en el servidor
      }
    }
    setAccount(null);
    setGuest(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // sin persistencia
    }
  }, [account]);

  const refresh = useCallback(async () => {
    setAccount(await readAccount());
    setStatus("ready");
  }, []);

  // Con cuenta se ignora al invitado (sin borrarlo). Cuenta sin username: sin nombre.
  const user = useMemo<SessionUser | null>(() => {
    if (account) {
      return account.username
        ? { name: account.username.toUpperCase().slice(0, 10) }
        : null;
    }
    return guest;
  }, [account, guest]);

  const value = useMemo(
    () => ({ user, account, status, login, logout, refresh }),
    [user, account, status, login, logout, refresh],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
