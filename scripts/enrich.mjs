#!/usr/bin/env node
// Builds src/data/vehicles.json for the site:
//   1. live listings from MarketCheck (when MARKETCHECK_API_KEY is set; otherwise the file's
//      current listings are kept, which in the repo are the sample listings),
//   2. CARFAX Canada history by VIN (when CARFAX_API_URL and CARFAX_API_KEY are set),
//   3. Transport Canada recalls (always; open data, no key).
// The deploy workflow runs this before every build. Keys stay in GitHub Actions secrets.
//
//   node scripts/enrich.mjs                    # everything that is configured
//   node scripts/enrich.mjs --only=listings
//   node scripts/enrich.mjs --only=recalls
//   node scripts/enrich.mjs --only=carfax
//   VRDB_CSV=/path/to/vrdb_full_monthly.csv node scripts/enrich.mjs   # reuse a downloaded file
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { enrichRecalls } from './providers/recalls.mjs';
import { enrichCarfax } from './providers/carfax.mjs';
import { fetchListings } from './providers/marketcheck.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(root, 'src/data/vehicles.json');
const metaPath = join(root, 'src/data/meta.json');
const config = JSON.parse(readFileSync(join(root, 'scripts/listings.config.json'), 'utf8'));
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
const today = new Date().toISOString().slice(0, 10);

let vehicles = JSON.parse(readFileSync(dataPath, 'utf8'));
const before = JSON.stringify(vehicles);
let meta = JSON.parse(readFileSync(metaPath, 'utf8'));

if (!only || only === 'listings') {
  const live = await fetchListings(config, { today });
  if (live && live.length) {
    vehicles = live;
    meta = { mode: 'live', provider: 'MarketCheck', refreshedAt: new Date().toISOString(), count: live.length, cities: config.cities.map((c) => c.name) };
  } else if (live) {
    // A live run that returns nothing must not wipe the site; keep what's there and fail loudly.
    throw new Error('MarketCheck returned no listings; keeping the previous data');
  }
}

if (!only || only === 'carfax') await enrichCarfax(vehicles, { today });
if (!only || only === 'recalls') await enrichRecalls(vehicles, { csvPath: process.env.VRDB_CSV, today });

// Shape checks before anything is written.
for (const v of vehicles) {
  const h = v.history;
  if (!h || !(h.accidents === null || Array.isArray(h.accidents))) throw new Error(`${v.id}: history missing`);
  if (h.damageReported === false && h.accidents?.length) throw new Error(`${v.id}: accidents listed but damageReported is false`);
  if (!v.price || !v.year || !v.make || !v.model) throw new Error(`${v.id}: missing price, year, make or model`);
  if (v.recalls && !Array.isArray(v.recalls.items)) throw new Error(`${v.id}: recalls.items missing`);
}

const after = JSON.stringify(vehicles);
if (after === before) {
  console.log('no data changes');
} else {
  writeFileSync(dataPath, JSON.stringify(vehicles, null, 2) + '\n');
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
  console.log(`wrote ${vehicles.length} vehicles to ${dataPath}`);
}
