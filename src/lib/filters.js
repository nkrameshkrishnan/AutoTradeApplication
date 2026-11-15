import vehicles from '../data/vehicles.json';
import { isClean, nonPersonal } from './history.js';

export const BODY_TYPES = ['All', 'SUV', 'Sedan', 'Truck', 'Hatchback', 'EV'];
export const TRANSMISSIONS = ['Automatic', 'Manual'];
export const DRIVETRAINS = ['AWD', 'FWD', 'RWD', '4WD'];
export const FUELS = ['Gas', 'Hybrid', 'Electric'];
export const SOURCES = ['Clutch', 'AutoTrader', 'CarGurus', 'Dealer Direct'];
export const HISTORY = ['No reported accidents', 'One owner', 'Personal use only'];

const historyTest = {
  'No reported accidents': (v) => isClean(v.history),
  'One owner': (v) => v.history?.owners === 1,
  'Personal use only': (v) => nonPersonal(v.history).length === 0,
};

export const SORTS = [
  { id: 'best', label: 'Best match' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'km-asc', label: 'Lowest kilometres' },
  { id: 'year-desc', label: 'Year: newest' },
];

const prices = vehicles.map((v) => v.price);
const years = vehicles.map((v) => v.year);
export const BOUNDS = {
  priceMin: Math.floor(Math.min(...prices) / 5000) * 5000,
  priceMax: Math.ceil(Math.max(...prices) / 5000) * 5000,
  yearMin: Math.min(...years),
  yearMax: Math.max(...years),
  kmMax: 100000,
};

export const EMPTY_FILTERS = {
  query: '',
  body: 'All',
  priceMin: BOUNDS.priceMin,
  priceMax: BOUNDS.priceMax,
  yearMin: BOUNDS.yearMin,
  yearMax: BOUNDS.yearMax,
  kmMax: BOUNDS.kmMax,
  transmission: [],
  drivetrain: [],
  fuel: [],
  source: [],
  history: [],
};

const haystack = (v) =>
  [v.year, v.make, v.model, v.trim, v.bodyType, v.fuelType, v.drivetrain, v.transmission, v.colour, v.city, v.source, ...v.features, isClean(v.history) ? 'no accidents clean carfax' : 'accident', v.history?.owners === 1 ? 'one owner' : '']
    .join(' ')
    .toLowerCase();

export function queryScore(v, query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return 1;
  const hay = haystack(v);
  const name = `${v.year} ${v.make} ${v.model} ${v.trim}`.toLowerCase();
  let score = 0;
  for (const t of terms) {
    if (!hay.includes(t)) return 0;
    score += name.includes(t) ? 3 : 1;
  }
  return score;
}

// Every test except `skip`, so a facet can count its own options against the other filters.
export function matches(v, f, skip = null) {
  if (skip !== 'query' && f.query && queryScore(v, f.query) === 0) return false;
  if (skip !== 'body' && f.body !== 'All') {
    if (f.body === 'EV' ? v.fuelType !== 'Electric' : v.bodyType !== f.body) return false;
  }
  if (skip !== 'price' && (v.price < f.priceMin || v.price > f.priceMax)) return false;
  if (skip !== 'year' && (v.year < f.yearMin || v.year > f.yearMax)) return false;
  if (skip !== 'km' && f.kmMax < BOUNDS.kmMax && v.odometer > f.kmMax) return false;
  if (skip !== 'transmission' && f.transmission.length && !f.transmission.includes(v.transmission)) return false;
  if (skip !== 'drivetrain' && f.drivetrain.length && !f.drivetrain.includes(v.drivetrain)) return false;
  if (skip !== 'fuel' && f.fuel.length && !f.fuel.includes(v.fuelType)) return false;
  if (skip !== 'source' && f.source.length && !f.source.includes(v.source)) return false;
  if (skip !== 'history' && f.history?.length && !f.history.every((h) => historyTest[h](v))) return false;
  return true;
}

const fieldOf = { transmission: 'transmission', drivetrain: 'drivetrain', fuel: 'fuelType', source: 'source' };

export function facetCounts(list, f, facet, options) {
  const pool = list.filter((v) => matches(v, f, facet));
  const counts = {};
  for (const o of options) {
    if (facet === 'history') counts[o] = pool.filter((v) => historyTest[o](v)).length;
    else if (facet === 'body') counts[o] = o === 'All' ? pool.length : pool.filter((v) => (o === 'EV' ? v.fuelType === 'Electric' : v.bodyType === o)).length;
    else counts[o] = pool.filter((v) => v[fieldOf[facet]] === o).length;
  }
  return counts;
}

export function sortList(list, sort, query) {
  const out = [...list];
  const deal = (v) => v.price / v.marketAvg;
  switch (sort) {
    case 'price-asc':
      return out.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return out.sort((a, b) => b.price - a.price);
    case 'km-asc':
      return out.sort((a, b) => a.odometer - b.odometer);
    case 'year-desc':
      return out.sort((a, b) => b.year - a.year || a.odometer - b.odometer);
    default:
      // Best match: search relevance first, then how far under market, then freshest listing.
      return out.sort((a, b) => queryScore(b, query) - queryScore(a, query) || deal(a) - deal(b) || a.listedDays - b.listedDays);
  }
}

export function activeFilterCount(f) {
  let n = 0;
  if (f.priceMin !== BOUNDS.priceMin || f.priceMax !== BOUNDS.priceMax) n++;
  if (f.yearMin !== BOUNDS.yearMin || f.yearMax !== BOUNDS.yearMax) n++;
  if (f.kmMax !== BOUNDS.kmMax) n++;
  n += f.transmission.length + f.drivetrain.length + f.fuel.length + f.source.length + (f.history?.length ?? 0);
  return n;
}
