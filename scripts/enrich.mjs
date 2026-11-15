#!/usr/bin/env node
// Refreshes vehicle history (CARFAX Canada, when licensed) and safety recalls (Transport Canada)
// in src/data/vehicles.json. Runs in GitHub Actions on a schedule; keys stay in Actions secrets.
//
//   node scripts/enrich.mjs                    # recalls, plus CARFAX if configured
//   node scripts/enrich.mjs --only=recalls
//   node scripts/enrich.mjs --only=carfax
//   VRDB_CSV=/path/to/vrdb_full_monthly.csv node scripts/enrich.mjs   # reuse a downloaded file
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { enrichRecalls } from './providers/recalls.mjs';
import { enrichCarfax } from './providers/carfax.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(root, 'src/data/vehicles.json');
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
const today = new Date().toISOString().slice(0, 10);

const vehicles = JSON.parse(readFileSync(dataPath, 'utf8'));
const before = JSON.stringify(vehicles);

if (!only || only === 'carfax') await enrichCarfax(vehicles, { today });
if (!only || only === 'recalls') await enrichRecalls(vehicles, { csvPath: process.env.VRDB_CSV, today });

// Shape checks before anything is written.
for (const v of vehicles) {
  const h = v.history;
  if (!h || !Array.isArray(h.accidents)) throw new Error(`${v.id}: history missing`);
  if (h.damageReported === false && h.accidents.length) throw new Error(`${v.id}: accidents listed but damageReported is false`);
  if (v.recalls && !Array.isArray(v.recalls.items)) throw new Error(`${v.id}: recalls.items missing`);
}

const after = JSON.stringify(vehicles);
if (after === before) {
  console.log('no data changes');
} else {
  writeFileSync(dataPath, JSON.stringify(vehicles, null, 2) + '\n');
  console.log(`wrote ${dataPath}`);
}
