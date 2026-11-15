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
