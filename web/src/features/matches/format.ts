const TIME_ZONE = "America/Sao_Paulo";

const weekday = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  timeZone: TIME_ZONE,
});
const time = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/** "Sáb · 18:30", no horário de Brasília. */
export function formatKickoff(iso: string): string {
  const date = new Date(iso);
  const day = weekday.format(date).replace(".", "");
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time.format(date)}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Quanto falta para o palpite trancar: "FECHA EM 2H14", "FECHA EM 9MIN", "FECHA EM 3 DIAS". */
export function formatTimeLeft(milliseconds: number): string {
  if (milliseconds <= 0) return "FECHANDO";
  if (milliseconds >= 2 * DAY)
    return `FECHA EM ${Math.floor(milliseconds / DAY)} DIAS`;
  if (milliseconds >= HOUR) {
    const hours = Math.floor(milliseconds / HOUR);
    const minutes = Math.floor((milliseconds % HOUR) / MINUTE);
    return `FECHA EM ${hours}H${String(minutes).padStart(2, "0")}`;
  }
  return `FECHA EM ${Math.max(1, Math.floor(milliseconds / MINUTE))}MIN`;
}
