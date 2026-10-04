export function currentSeason(): number {
  const configured = Number(process.env["CURRENT_SEASON"]);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : new Date().getFullYear();
}
