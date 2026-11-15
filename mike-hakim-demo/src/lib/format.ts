export const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
export const usdShort = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2)}M` : `$${Math.round(n / 1000)}K`;
export const num = (n: number) => n.toLocaleString("en-US");
export const bytes = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);
export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
export function initials(first: string, last: string) {
  return (first[0] ?? "").toUpperCase() + (last[0] ?? "").toUpperCase();
}
