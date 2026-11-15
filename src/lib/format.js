const cad0 = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 });
const cad2 = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 });

export const money = (n) => cad0.format(Math.round(n));
export const money2 = (n) => cad2.format(n);
export const km = (n) => `${int.format(n)} km`;
export const num = (n) => int.format(n);
export const signedMoney = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + cad0.format(Math.abs(Math.round(n)));

// "Mazda Mazda3 Sport" reads as a stutter; drop the make when the model already carries it.
const makeModel = (v) => (v.model.startsWith(v.make) ? v.model : `${v.make} ${v.model}`);
export const title = (v) => `${v.year} ${makeModel(v)}`;
export const fullTitle = (v) => `${title(v)} ${v.trim}`;
export const place = (v) => `${v.city}, ${v.province}`;

export function listedAgo(days) {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const w = Math.floor(days / 7);
  return w === 1 ? '1 week ago' : `${w} weeks ago`;
}

export function efficiency(v) {
  if (v.fuelType === 'Electric') return `${num(v.evRange)} km range`;
  return `${v.fuelCity.toFixed(1)} city / ${v.fuelHwy.toFixed(1)} hwy L/100 km`;
}

export const asset = (path) => `${import.meta.env.BASE_URL}${path}`;
