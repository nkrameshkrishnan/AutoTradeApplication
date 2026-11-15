// Sales tax on a vehicle purchased from a dealer, by province of registration.
// Rates as of 2026. Trade-in value is deducted before tax (applies in most provinces).
export const PROVINCES = [
  { code: 'ON', name: 'Ontario', rate: 0.13, label: 'HST 13%' },
  { code: 'BC', name: 'British Columbia', rate: 0.12, label: 'GST 5% + PST 7%' },
  { code: 'AB', name: 'Alberta', rate: 0.05, label: 'GST 5%' },
  { code: 'QC', name: 'Quebec', rate: 0.14975, label: 'GST 5% + QST 9.975%' },
  { code: 'MB', name: 'Manitoba', rate: 0.12, label: 'GST 5% + RST 7%' },
  { code: 'SK', name: 'Saskatchewan', rate: 0.11, label: 'GST 5% + PST 6%' },
  { code: 'NS', name: 'Nova Scotia', rate: 0.14, label: 'HST 14%' },
  { code: 'NB', name: 'New Brunswick', rate: 0.15, label: 'HST 15%' },
  { code: 'NL', name: 'Newfoundland and Labrador', rate: 0.15, label: 'HST 15%' },
  { code: 'PE', name: 'Prince Edward Island', rate: 0.15, label: 'HST 15%' },
  { code: 'YT', name: 'Yukon', rate: 0.05, label: 'GST 5%' },
  { code: 'NT', name: 'Northwest Territories', rate: 0.05, label: 'GST 5%' },
  { code: 'NU', name: 'Nunavut', rate: 0.05, label: 'GST 5%' },
];

export const provinceByCode = (code) => PROVINCES.find((p) => p.code === code) ?? PROVINCES[0];

export const TERMS = [36, 48, 60, 72, 84];

export const DEFAULT_FINANCE = {
  downPayment: 0,
  tradeIn: 0,
  term: 72,
  apr: 7.99,
  province: 'ON',
};

const round2 = (n) => Math.round(n * 100) / 100;

function amortize(principal, annualRate, periodsPerYear, periods) {
  if (principal <= 0 || periods <= 0) return 0;
  const r = annualRate / 100 / periodsPerYear;
  if (r === 0) return principal / periods;
  return (principal * r) / (1 - Math.pow(1 + r, -periods));
}

/**
 * Every figure is rounded to the cent before the next one is built from it,
 * so the breakdown on screen always adds up to the amount financed.
 */
export function calculateFinance(price, settings) {
  const { downPayment = 0, tradeIn = 0, term = 72, apr = 0, province = 'ON' } = settings;
  const prov = provinceByCode(province);
  const tradeCredit = round2(Math.min(Math.max(tradeIn, 0), price));
  const taxable = round2(price - tradeCredit);
  const tax = round2(taxable * prov.rate);
  const down = round2(Math.min(Math.max(downPayment, 0), taxable + tax));
  const financed = round2(taxable + tax - down);
  const monthly = round2(amortize(financed, apr, 12, term));
  const biweeklyPeriods = Math.round((term / 12) * 26);
  const biweekly = round2(amortize(financed, apr, 26, biweeklyPeriods));
  const totalPaid = round2(monthly * term);
  const interest = round2(Math.max(totalPaid - financed, 0));
  return { prov, tradeCredit, taxable, tax, down, financed, monthly, biweekly, biweeklyPeriods, totalPaid, interest };
}

// Price position against similar listings (same model, ±2 years, ±25,000 km).
export function priceRating(v) {
  // Too few comparable listings to judge the price: say nothing rather than guess.
  if (!v.marketAvg) return { key: 'none', label: 'Not rated', diff: 0, pct: 0 };
  const diff = v.price - v.marketAvg;
  const pct = diff / v.marketAvg;
  if (pct <= -0.05) return { key: 'great', label: 'Great deal', diff, pct };
  if (pct <= 0.03) return { key: 'fair', label: 'Fair price', diff, pct };
  return { key: 'above', label: 'Above market', diff, pct };
}

// Data checks: totals on screen must reconcile.
if (import.meta.env?.DEV) {
  const t = calculateFinance(33990, { downPayment: 2000, tradeIn: 5000, term: 72, apr: 7.99, province: 'ON' });
  console.assert(round2(t.taxable + t.tax - t.down) === t.financed, 'financed = taxable + tax − down');
  console.assert(t.taxable === 28990 && t.tax === 3768.7, 'ON HST on price less trade-in');
}
