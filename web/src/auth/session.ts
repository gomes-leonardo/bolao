/**
 * Como o front se identifica para a API.
 * - dev: id de um usuário do seed, enviado no header X-Dev-User-Id (AUTH_MODE=dev na API).
 * - token: access token JWT da fase 4, enviado como Bearer.
 */
export type Session =
  { kind: "dev"; userId: number } | { kind: "token"; accessToken: string };

const STORAGE_KEY = "carimbou.session";

function isSession(value: unknown): value is Session {
  if (typeof value !== "object" || value === null || !("kind" in value))
    return false;
  if (value.kind === "dev")
    return "userId" in value && typeof value.userId === "number";
  if (value.kind === "token")
    return "accessToken" in value && typeof value.accessToken === "string";
  return false;
}

// O storage pode lançar (aba anônima, cota cheia); sem ele a sessão só não persiste.
export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSession(session: Session): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Segue sem persistir: a sessão vale só até recarregar a página.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nada a limpar se o storage não está disponível.
  }
}

export function authHeaders(session: Session | null): Record<string, string> {
  if (!session) return {};
  return session.kind === "dev"
    ? { "X-Dev-User-Id": String(session.userId) }
    : { Authorization: `Bearer ${session.accessToken}` };
}
