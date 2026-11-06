// Política de contraseña (SPEC 13). Única fuente: la usan las Server Actions
// y los formularios. Todo ASCII y con el mismo conjunto de símbolos que
// «Password Requirements» de Supabase Auth, para que lo aceptado aquí no lo
// rechace Supabase. Sin "use server": ese archivo solo puede exportar funciones async.

export const MIN_PASSWORD = 8;
// bcrypt ignora lo que pasa de 72 bytes: se limita para no aceptar contraseñas truncadas.
export const MAX_PASSWORD = 72;

const SYMBOLS = `!@#$%^&*()_+\\-=\\[\\]{};':"\\\\|<>?,./\`~`;

export const PASSWORD_RE = new RegExp(
  `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[${SYMBOLS}]).{${MIN_PASSWORD},${MAX_PASSWORD}}$`,
);

export const PASSWORD_ERROR = `La contraseña debe tener entre ${MIN_PASSWORD} y ${MAX_PASSWORD} caracteres, con minúscula, mayúscula, número y símbolo.`;

export interface PasswordChecks {
  length: boolean;
  lower: boolean;
  upper: boolean;
  digit: boolean;
  symbol: boolean;
}

const SYMBOL_RE = new RegExp(`[${SYMBOLS}]`);

export function passwordChecks(password: string): PasswordChecks {
  return {
    length:
      password.length >= MIN_PASSWORD && password.length <= MAX_PASSWORD,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    symbol: SYMBOL_RE.test(password),
  };
}

export function isStrongPassword(password: string): boolean {
  return PASSWORD_RE.test(password);
}
