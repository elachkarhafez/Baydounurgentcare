export interface MortgageInput {
  price: number;
  downPct: number; // 0-100
  rate: number; // annual %
  years: number;
  taxYearly: number;
  insuranceYearly: number;
  hoaMonthly?: number;
}

/** Standard amortized principal + interest, plus monthly tax, insurance and HOA. */
export function monthlyPayment(i: MortgageInput) {
  const principal = Math.max(0, i.price * (1 - i.downPct / 100));
  const n = i.years * 12;
  const r = i.rate / 100 / 12;
  const pi = principal === 0 ? 0 : r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
  const tax = i.taxYearly / 12;
  const ins = i.insuranceYearly / 12;
  const hoa = i.hoaMonthly ?? 0;
  return { principal, pi, tax, ins, hoa, total: pi + tax + ins + hoa, down: i.price - principal };
}
