// Live used-car listings from Canadian dealers, through the MarketCheck Inventory Search API.
// Docs: https://docs.marketcheck.com/docs/api/cars/inventory/inventory-search
//
//   MARKETCHECK_API_KEY   required; a GitHub Actions secret. Without it the step is skipped
//                         and the site keeps whatever is in src/data/vehicles.json.
//   MARKETCHECK_ODOMETER_UNIT  "mi" (default, per MarketCheck's docs: `miles` is in miles in
//                         both markets) or "km" if your account returns kilometres for Canada.
//
// What to fetch (cities, radius, year range, how many) lives in scripts/listings.config.json.
// Price ratings come from MarketCheck's own stats: one stats call per make/model/year group.

const BASE = 'https://api.marketcheck.com/v2/search/car/active';
const MI_TO_KM = 1.609344;

const FEATURE_WORDS = [
  ['Heated front seats', /heated (front )?seats?/i],
  ['Heated steering wheel', /heated steering/i],
  ['Heated rear seats', /heated rear seats?/i],
  ['Ventilated front seats', /ventilated|cooled seats?/i],
  ['Panoramic sunroof', /panoram/i],
  ['Sunroof', /sunroof|moonroof/i],
  ['Adaptive cruise control', /adaptive cruise/i],
  ['Apple CarPlay', /carplay/i],
  ['Android Auto', /android auto/i],
  ['Blind-spot monitoring', /blind[- ]spot/i],
  ['Lane-keep assist', /lane[- ](keep|keeping|departure)/i],
  ['360° camera', /360|surround view|bird'?s[- ]eye/i],
  ['Remote start', /remote start/i],
  ['Leather seats', /leather/i],
  ['Wireless charging', /wireless charg/i],
  ['Power liftgate', /power (lift|tail)gate/i],
  ['Head-up display', /head[- ]up display|hud\b/i],
  ['Built-in navigation', /navigation|\bnav\b|gps/i],
  ['Tow package', /tow(ing)? (package|hitch)|trailer hitch/i],
  ['Premium audio', /bose|harman|bang ?& ?olufsen|burmester|premium (audio|sound)|jbl|mark levinson/i],
  ['Third-row seating', /third[- ]row|3rd row/i],
];

function body(b = '') {
  const s = b.toLowerCase();
  if (/pickup|truck/.test(s)) return 'Truck';
  if (/suv|crossover/.test(s)) return 'SUV';
  if (/sedan/.test(s)) return 'Sedan';
  if (/hatch/.test(s)) return 'Hatchback';
  if (/wagon/.test(s)) return 'Wagon';
  if (/coupe/.test(s)) return 'Coupe';
  if (/convertible/.test(s)) return 'Convertible';
  if (/van|minivan/.test(s)) return 'Van';
  return b || 'Other';
}

function fuel(build = {}) {
  const f = `${build.fuel_type ?? ''} ${build.powertrain_type ?? ''}`.toLowerCase();
  if (/bev|electric(?!.*(gas|unleaded|hybrid))/.test(f)) return 'Electric';
  if (/hybrid|hev|phev/.test(f)) return 'Hybrid';
  if (/diesel/.test(f)) return 'Diesel';
  return 'Gas';
}

function drivetrain(d = '') {
  const s = d.toUpperCase();
  if (/4WD|4X4|FOUR/.test(s)) return '4WD';
  if (/AWD|ALL/.test(s)) return 'AWD';
  if (/RWD|REAR/.test(s)) return 'RWD';
  if (/FWD|FRONT/.test(s)) return 'FWD';
  return s || null;
}

function platform(src = '') {
  const s = src.toLowerCase();
  if (s.includes('autotrader')) return 'AutoTrader';
  if (s.includes('clutch')) return 'Clutch';
  if (s.includes('cargurus')) return 'CarGurus';
  return 'Dealer Direct';
}

const mpgToL100 = (mpg) => (mpg ? Math.round((235.215 / mpg) * 10) / 10 : null);
const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const titleCase = (s) => (s ? s.replace(/\w\S*/g, (w) => (w.length <= 3 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1).toLowerCase())) : s);

export function toVehicle(r, { odometerUnit = 'mi', today = new Date().toISOString().slice(0, 10) } = {}) {
  const b = r.build ?? {};
  const d = r.dealer ?? {};
  const year = Number(b.year);
  const make = b.make;
  const model = b.model;
  if (!year || !make || !model || !r.price || !r.vin) return null;

  const fuelType = fuel(b);
  const photos = (r.media?.photo_links_cached?.length ? r.media.photo_links_cached : r.media?.photo_links) ?? [];
  const featureText = [...(r.extra?.features ?? []), ...(r.extra?.options ?? []), r.heading ?? ''].join(' | ');
  const features = FEATURE_WORDS.filter(([, re]) => re.test(featureText)).map(([name]) => name);
  const km = r.miles == null ? null : Math.round(odometerUnit === 'km' ? r.miles : r.miles * MI_TO_KM);
  const trans = /manual/i.test(b.transmission ?? '') ? 'Manual' : 'Automatic';
  const name = `${year} ${make} ${model} ${b.trim ?? ''}`.trim();

  return {
    id: `${slug(`${year}-${make}-${model}-${b.trim ?? ''}`)}-${String(r.vin).slice(-6).toLowerCase()}`,
    year,
    make,
    model,
    trim: b.trim || '',
    bodyType: body(b.body_type),
    price: Math.round(r.price),
    marketAvg: null,
    marketLow: null,
    marketHigh: null,
    marketCount: null,
    marketBasis: null,
    odometer: km,
    city: titleCase(d.city) || null,
    province: d.state || null,
    source: platform(r.source),
    engine: b.engine || null,
    horsepower: null,
    transmission: trans,
    transmissionDetail: b.transmission || trans,
    drivetrain: drivetrain(b.drivetrain),
    fuelType,
    fuelCity: fuelType === 'Electric' ? null : mpgToL100(b.city_mpg),
    fuelHwy: fuelType === 'Electric' ? null : mpgToL100(b.highway_mpg),
    evRange: null,
    evConsumption: null,
    colour: r.exterior_color || null,
    seats: b.std_seating ? Number(b.std_seating) : null,
    listedDays: r.dom_active ?? r.dom ?? 0,
    features,
    images: photos.slice(0, 8).map((src) => ({
      src,
      alt: name,
      credit: { title: name, creator: d.name || 'the dealer', license: null, source: r.vdp_url || null },
    })),
    inspection: null,
    sourceUrl: r.vdp_url || null,
    dealer: { name: d.name || null, phone: d.phone || null, website: d.website || null, street: d.street || null },
    vin: r.vin,
    recallQuery: { make: make.toUpperCase(), models: [model.toUpperCase()], year },
    // Only what the dealer's listing states. Accidents are unknown until CARFAX is connected.
    history: {
      provider: 'CARFAX Canada',
      source: 'listing-flags',
      product: null,
      asOf: today,
      reportUrl: null,
      owners: r.carfax_1_owner === true ? 1 : null,
      accidents: null,
      damageReported: null,
      policeReportedAccident: null,
      totalLoss: null,
      frameDamage: null,
      airbagDeployed: null,
      fireFloodDamage: null,
      stolen: null,
      odometerProblem: null,
      titleBrand: r.carfax_clean_title === true ? 'Normal' : null,
      usHistory: null,
      ownershipTypes: [],
      registrations: [],
      lastRegisteredProvince: d.state || null,
      serviceRecords: null,
    },
    recalls: null,
  };
}

function pct(stats, p) {
  const ps = stats?.percentiles;
  if (!ps) return null;
  if (Array.isArray(ps)) return ps.find((x) => Number(x.percent ?? x.key) === p)?.value ?? null;
  return ps[`${p}.0`] ?? ps[p] ?? ps[String(p)] ?? null;
}

async function call(params, { apiKey, fetchImpl }) {
  const url = new URL(BASE);
  for (const [k, v] of Object.entries({ ...params, api_key: apiKey, country: 'ca' })) if (v != null) url.searchParams.set(k, v);
  const res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`MarketCheck HTTP ${res.status}`); // the URL holds the key, so never log it
  return res.json();
}

export function marketcheckConfigured(env = process.env) {
  return Boolean(env.MARKETCHECK_API_KEY);
}

export async function fetchListings(config, { env = process.env, fetchImpl = fetch, log = console.log, today } = {}) {
  if (!marketcheckConfigured(env)) {
    log('listings: skipped (set MARKETCHECK_API_KEY to load live listings)');
    return null;
  }
  const apiKey = env.MARKETCHECK_API_KEY;
  const odometerUnit = env.MARKETCHECK_ODOMETER_UNIT === 'km' ? 'km' : 'mi';
  const opts = { apiKey, fetchImpl };
  const seen = new Map();

  for (const c of config.cities) {
    let got = 0;
    for (let start = 0; got < config.perCity && start < 1000; start += 50) {
      const rows = Math.min(50, config.perCity - got);
      const json = await call(
        {
          car_type: 'used',
          latitude: c.lat,
          longitude: c.lng,
          radius: config.radiusMiles,
          year_range: `${config.yearMin}-${new Date().getFullYear() + 1}`,
          price_range: `${config.priceMin}-${config.priceMax}`,
          rows,
          start,
          sort_by: 'dom',
          sort_order: 'asc',
        },
        opts
      );
      const list = json.listings ?? [];
      for (const r of list) {
        const v = toVehicle(r, { odometerUnit, today });
        if (v && !seen.has(r.vin)) {
          seen.set(r.vin, v);
          got++;
        }
      }
      if (list.length < rows) break;
    }
    log(`listings: ${c.name} ${got}`);
  }

  const vehicles = [...seen.values()];
  await addMarketStats(vehicles, opts, log);
  log(`listings: ${vehicles.length} vehicles, ${vehicles.filter((v) => v.marketAvg).length} with a price rating`);
  return vehicles;
}

// One stats call per make/model/year; listings across Canada are the comparison pool.
async function addMarketStats(vehicles, opts, log) {
  const groups = new Map();
  for (const v of vehicles) {
    const k = `${v.make}|${v.model}|${v.year}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(v);
  }
  for (const [k, cars] of groups) {
    const [make, model, year] = k.split('|');
    try {
      const json = await call({ car_type: 'used', make, model, year_range: `${year}-${year}`, stats: 'price', rows: 0 }, opts);
      const s = json.stats?.price;
      if (!s || (s.count ?? 0) < 5 || !s.mean) continue; // too few comparables to rate fairly
      const avg = Math.round(s.median ?? s.mean);
      const low = Math.round(pct(s, 5) ?? Math.max(s.min, s.mean - 2 * (s.stddev ?? 0)));
      const high = Math.round(pct(s, 95) ?? Math.min(s.max, s.mean + 2 * (s.stddev ?? 0)));
      for (const v of cars) {
        v.marketAvg = avg;
        v.marketLow = Math.min(low, v.price);
        v.marketHigh = Math.max(high, v.price);
        v.marketCount = s.count;
        v.marketBasis = `${s.count.toLocaleString('en-CA')} used ${year} ${make} ${model} listings across Canada`;
      }
    } catch (e) {
      log(`listings: stats for ${make} ${model} ${year} failed (${e.message})`);
    }
  }
}
