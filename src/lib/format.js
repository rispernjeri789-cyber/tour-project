export function formatKes(amount) {
  return `KES ${Number(amount || 0).toLocaleString("en-KE")}`;
}
