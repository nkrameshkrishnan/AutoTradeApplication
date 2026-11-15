// Safety recalls from Transport Canada's Motor Vehicle Safety Recalls Database (open data, no key).
// Dataset: https://open.canada.ca/data/en/dataset/1ec92326-47ef-4110-b7ca-959fab03f96d
//
// Recalls are matched by make, model and model year. A model-year recall may not apply to every
// vehicle (it depends on build dates and options), and the file does not say whether a given car
// has been fixed. The app says so and points to the manufacturer's VIN lookup.
import { createWriteStream, existsSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { readCsv } from '../lib/csv.mjs';

export const VRDB_CSV_URL = 'https://opendatatc.tc.canada.ca/vrdb_full_monthly.csv';

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Recall file download failed: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

const clean = (s) => s.replace(/\s+/g, ' ').trim();

export async function enrichRecalls(vehicles, { csvPath, today, log = console.log }) {
  const path = csvPath ?? '/tmp/vrdb_full_monthly.csv';
  if (!csvPath || !existsSync(path)) {
    log(`recalls: downloading ${VRDB_CSV_URL}`);
    await download(VRDB_CSV_URL, path);
  }

  // Index the cars by make|year so each CSV row is one map lookup.
  const wanted = new Map();
  for (const v of vehicles) {
    const q = v.recallQuery;
    if (!q) continue;
    const key = `${q.make.toUpperCase()}|${q.year}`;
    if (!wanted.has(key)) wanted.set(key, []);
    wanted.get(key).push(v);
  }
  const found = new Map(vehicles.map((v) => [v.id, new Map()]));

  let rows = 0;
  for await (const r of readCsv(path)) {
    rows++;
    const year = Math.trunc(Number(r.YEAR));
    const key = `${(r.MAKE_NAME_NM || '').trim().toUpperCase()}|${year}`;
    const cars = wanted.get(key);
    if (!cars) continue;
    const model = (r.MODEL_NAME_NM || '').trim().toUpperCase();
    for (const v of cars) {
      if (!v.recallQuery.models.some((m) => m.toUpperCase() === model)) continue;
      const number = String(r.RECALL_NUMBER_NUM).trim();
      const items = found.get(v.id);
      if (items.has(number)) continue; // one row per model; keep one per recall
      items.set(number, {
        number,
        date: (r.RECALL_DATE_DTE || '').slice(0, 10) || null,
        system: clean(r.SYSTEM_TYPE_ETXT || '') || null,
        manufacturerNumber: clean(r.MANUFACTURER_RECALL_NO_TXT || '') || null,
        summary: clean(r.COMMENT_ETXT || ''),
      });
    }
  }
  if (rows < 1000) throw new Error(`Recall file looks wrong: only ${rows} rows`);

  for (const v of vehicles) {
    if (!v.recallQuery) continue;
    const items = [...found.get(v.id).values()].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
    v.recalls = {
      source: 'Transport Canada',
      dataset: 'Motor Vehicle Safety Recalls Database',
      url: 'https://tc.canada.ca/en/road-transportation/defects-recalls-vehicles-tires-child-car-seats',
      scope: 'model-year',
      asOf: today,
      items,
    };
  }
  log(`recalls: scanned ${rows.toLocaleString('en-CA')} rows; ${vehicles.map((v) => v.recalls?.items.length ?? 0).join(', ')} recalls per car`);
  return vehicles;
}
