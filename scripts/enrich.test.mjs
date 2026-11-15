// node --test scripts/enrich.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readCsv } from './lib/csv.mjs';
import { mapCarfax, enrichCarfax } from './providers/carfax.mjs';

test('csv: quotes, escaped quotes and newlines inside fields', async () => {
  const src = Readable.from(['a,b,c\r\n1,"x, ""y""\nz",3\n', '4,5,6']);
  const rows = [];
  for await (const r of readCsv(src)) rows.push(r);
  assert.deepEqual(rows, [
    { a: '1', b: 'x, "y"\nz', c: '3' },
    { a: '4', b: '5', c: '6' },
  ]);
});

test('carfax: maps VIN Scan labels whatever their casing or nesting', () => {
  const json = { vehicle: { OWNERS: '2', TitleBrand: 'Rebuilt', 'frame-damage': 'Y', flags: [{ name: 'Is Stolen', value: false }] }, latest_damage_date: '2024-03-02T00:00:00', 'Latest Damage Province': 'ON' };
  const h = mapCarfax(json, { registrations: ['ON'] }, '2026-11-15');
  assert.equal(h.owners, 2);
  assert.equal(h.titleBrand, 'Rebuilt');
  assert.equal(h.frameDamage, true);
  assert.equal(h.stolen, false);
  assert.equal(h.totalLoss, null, 'missing flags stay null, never false');
  assert.deepEqual(h.accidents, [{ date: '2024-03-02', province: 'ON', description: 'Damage reported to CARFAX Canada', claim: null }]);
  assert.deepEqual(h.registrations, ['ON']);
});

test('carfax: skips without config, skips sample VINs, keeps history on failure, never leaks the key', async () => {
  const cars = [
    { id: 'sample', vin: null, history: { accidents: [] } },
    { id: 'real', vin: '1HGCM82633A004352', history: { source: 'listing', accidents: [], reportUrl: 'https://vhr.carfax.ca/?id=x' } },
  ];
  const quiet = () => {};
  assert.equal((await enrichCarfax(cars, { env: {}, log: quiet })).updated, 0);

  const seen = [];
  const env = { CARFAX_API_URL: 'https://api.example/vin/{vin}', CARFAX_API_KEY: 'secret' };
  const ok = async (url, init) => (seen.push([url, init.headers.Authorization]), { ok: true, json: async () => ({ Owners: 1 }) });
  const r = await enrichCarfax(cars, { env, today: '2026-11-15', log: quiet, fetchImpl: ok });
  assert.deepEqual(r, { updated: 1, skipped: 1, failed: 0 });
  assert.deepEqual(seen, [['https://api.example/vin/1HGCM82633A004352', 'Bearer secret']]);
  assert.equal(cars[1].history.reportUrl, 'https://vhr.carfax.ca/?id=x', 'listing link survives');

  const logs = [];
  const before = cars[1].history;
  await enrichCarfax(cars, { env, today: '2026-11-15', log: (m) => logs.push(m), fetchImpl: async () => ({ ok: false, status: 503 }) });
  assert.equal(cars[1].history, before);
  assert.ok(!logs.join(' ').includes('secret'));
});

// ---- MarketCheck listings ----
import { toVehicle, fetchListings } from './providers/marketcheck.mjs';

const mcListing = (over = {}) => ({
  id: 'abc-1',
  vin: '2HKRS6H58RH800123',
  heading: '2024 Honda CR-V Hybrid EX-L AWD Heated Steering Wheel Apple CarPlay',
  price: 41990,
  miles: 15000,
  dom: 12,
  dom_active: 9,
  exterior_color: 'Crystal Black Pearl',
  vdp_url: 'https://www.exampledealer.ca/used/2024-honda-cr-v-123',
  source: 'exampledealer.ca',
  carfax_1_owner: true,
  carfax_clean_title: true,
  media: { photo_links: ['https://img.example/1.jpg', 'https://img.example/2.jpg'] },
  dealer: { name: 'Example Honda', city: 'TORONTO', state: 'ON', phone: '416-555-0100', website: 'exampledealer.ca' },
  build: { year: 2024, make: 'Honda', model: 'CR-V', trim: 'EX-L', body_type: 'SUV', transmission: 'Automatic', drivetrain: 'AWD', fuel_type: 'Electric / Unleaded', powertrain_type: 'HEV', engine: '2.0L I4', std_seating: '5', city_mpg: 40, highway_mpg: 34 },
  ...over,
});

test('marketcheck: maps a listing to the app model', () => {
  const v = toVehicle(mcListing(), { today: '2026-11-15' });
  assert.equal(v.odometer, 24140, '15,000 mi → km');
  assert.equal(v.fuelType, 'Hybrid');
  assert.equal(v.city, 'Toronto');
  assert.equal(v.source, 'Dealer Direct');
  assert.equal(v.sourceUrl, 'https://www.exampledealer.ca/used/2024-honda-cr-v-123');
  assert.equal(v.fuelCity, 5.9);
  assert.deepEqual(v.features, ['Heated steering wheel', 'Apple CarPlay']);
  assert.equal(v.history.owners, 1);
  assert.equal(v.history.titleBrand, 'Normal');
  assert.equal(v.history.accidents, null, 'accidents unknown, not "none"');
  assert.equal(v.images[0].src, 'https://img.example/1.jpg');
  assert.deepEqual(v.recallQuery, { make: 'HONDA', models: ['CR-V'], year: 2024 });
  assert.equal(toVehicle(mcListing({ price: 0 })), null, 'listings without a price are dropped');
  assert.equal(toVehicle(mcListing({ miles: 24140 }), { odometerUnit: 'km' }).odometer, 24140);
});

test('marketcheck: fetches per city, dedupes by VIN, rates price from stats, never logs the key', async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(String(url));
    const u = new URL(url);
    if (u.searchParams.get('stats')) {
      return { ok: true, json: async () => ({ num_found: 120, stats: { price: { count: 120, mean: 43000, median: 43500, min: 36000, max: 52000, stddev: 3000, percentiles: { '5.0': 38500, '95.0': 48200 } } } }) };
    }
    return { ok: true, json: async () => ({ num_found: 2, listings: [mcListing(), mcListing()] }) };
  };
  const logs = [];
  const config = { perCity: 10, radiusMiles: 30, yearMin: 2015, priceMin: 5000, priceMax: 120000, cities: [{ name: 'Toronto', lat: 43.65, lng: -79.38 }, { name: 'Ottawa', lat: 45.42, lng: -75.69 }] };
  const out = await fetchListings(config, { env: { MARKETCHECK_API_KEY: 'k3y' }, fetchImpl, log: (m) => logs.push(m), today: '2026-11-15' });
  assert.equal(out.length, 1, 'same VIN in two cities is one car');
  assert.equal(out[0].marketAvg, 43500);
  assert.equal(out[0].marketLow, 38500);
  assert.equal(out[0].marketHigh, 48200);
  assert.match(out[0].marketBasis, /120 used 2024 Honda CR-V listings across Canada/);
  assert.ok(urls.every((u) => new URL(u).searchParams.get('country') === 'ca'));
  assert.ok(!logs.join(' ').includes('k3y'));
  assert.equal(await fetchListings(config, { env: {}, log: () => {} }), null, 'skips without a key');
});

test('marketcheck: too few comparables means no rating', async () => {
  const fetchImpl = async (url) =>
    new URL(url).searchParams.get('stats')
      ? { ok: true, json: async () => ({ stats: { price: { count: 3, mean: 40000, median: 40000, min: 39000, max: 41000 } } }) }
      : { ok: true, json: async () => ({ listings: [mcListing()] }) };
  const config = { perCity: 5, radiusMiles: 30, yearMin: 2015, priceMin: 5000, priceMax: 120000, cities: [{ name: 'Toronto', lat: 1, lng: 1 }] };
  const [v] = await fetchListings(config, { env: { MARKETCHECK_API_KEY: 'k' }, fetchImpl, log: () => {} });
  assert.equal(v.marketAvg, null);
});

import { modelKey } from './providers/recalls.mjs';
test('recalls: model names match across spellings', () => {
  assert.equal(modelKey('Kona Electric'), modelKey('KONA EV'));
  assert.equal(modelKey('F150'), modelKey('F-150'));
  assert.notEqual(modelKey('Mustang'), modelKey('MUSTANG MACH-E'));
});
