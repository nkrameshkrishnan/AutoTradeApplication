// CARFAX Canada vehicle history, through the API you license from CARFAX Canada
// (VIN Scan Summary, or the VHR Order/Look-up API). Contact: https://go.carfax.ca/big-solutions
//
// CARFAX Canada does not publish its API reference, so the request and the field names are
// configuration, not guesses baked into code:
//   CARFAX_API_URL      URL template containing {vin}, e.g. https://<host>/<path>/{vin}
//   CARFAX_API_KEY      credential (GitHub Actions secret; never logged, never shipped to the browser)
//   CARFAX_AUTH_HEADER  optional header name, default "Authorization" (value "Bearer <key>")
//   CARFAX_AUTH_SCHEME  optional scheme, default "Bearer"; set to "" to send the key bare
//
// Fields are read by their VIN Scan Detail data-dictionary labels ("Owners", "Title Brand",
// "Frame Damage", ...), matched without regard to case, spaces or punctuation, at any depth.
// Check the mapping below against the response CARFAX sends you and adjust LABELS if needed.
//
// Only listings with a real `vin` are looked up. Sample listings have vin: null and are skipped,
// so a misconfigured run can never order reports for VINs that aren't yours.

const LABELS = {
  owners: ['Owners', 'Number Of Owners', 'Owner Count'],
  damageReported: ['Damage Reported'],
  policeReportedAccident: ['Police Reported Accidents'],
  totalLoss: ['Canadian Total Loss', 'Total Loss'],
  frameDamage: ['Frame Damage'],
  airbagDeployed: ['Deployed Airbag'],
  fireDamage: ['Fire Damage'],
  floodDamage: ['Flood Damage'],
  fireFloodDamage: ['Fire/Flood Damage'],
  stolen: ['Is Stolen', 'Stolen'],
  odometerProblem: ['Odometer Problem Reported', 'Odometer Problem'],
  titleBrand: ['Title Brand'],
  usHistory: ['Has USA History'],
  nonPersonalOwnership: ['Non-Personal Ownership'],
  ownershipTypes: ['Ownership Types'],
  lastRegisteredProvince: ['Latest Canadian Registered Province', 'Current Registration Jurisdiction'],
  latestDamageDate: ['Latest Damage Date'],
  latestDamageProvince: ['Latest Damage Province'],
  openRecalls: ['Has Open Recalls'],
  reportUrl: ['Report URL', 'VHR URL', 'Report Link'],
};

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// Depth-first search for the first key matching any label.
function pick(obj, labels) {
  const targets = new Set(labels.map(norm));
  const stack = [obj];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object') continue;
    for (const [k, val] of Object.entries(cur)) {
      if (targets.has(norm(k)) && (val === null || typeof val !== 'object' || Array.isArray(val))) return val;
      // Some APIs return [{ name: "Owners", value: 2 }]
      if (val && typeof val === 'object' && 'name' in val && 'value' in val && targets.has(norm(val.name))) return val.value;
      if (val && typeof val === 'object') stack.push(val);
    }
  }
  return undefined;
}

const bool = (v) => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'boolean') return v;
  return /^(y|yes|true|1)$/i.test(String(v).trim());
};
const int = (v) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Math.trunc(Number(v)));

export function mapCarfax(json, previous = {}, today) {
  const get = (k) => pick(json, LABELS[k]);
  const fire = bool(get('fireDamage'));
  const flood = bool(get('floodDamage'));
  const fireFlood = bool(get('fireFloodDamage')) ?? (fire === null && flood === null ? null : Boolean(fire || flood));
  const types = get('ownershipTypes');
  const latestDamageDate = get('latestDamageDate');
  return {
    provider: 'CARFAX Canada',
    source: 'carfax-api',
    product: 'VIN Scan Summary',
    asOf: today,
    // A report link supplied with the listing wins over none from the API.
    reportUrl: get('reportUrl') || previous.reportUrl || null,
    owners: int(get('owners')),
    // VIN Scan gives flags, not itemised claims. Keep the listing's itemised list if one exists,
    // otherwise record the latest damage date as a single entry.
    accidents:
      previous.source === 'listing' && previous.accidents?.length
        ? previous.accidents
        : latestDamageDate
          ? [{ date: String(latestDamageDate).slice(0, 10), province: get('latestDamageProvince') || null, description: 'Damage reported to CARFAX Canada', claim: null }]
          : [],
    damageReported: bool(get('damageReported')),
    policeReportedAccident: bool(get('policeReportedAccident')),
    totalLoss: bool(get('totalLoss')),
    frameDamage: bool(get('frameDamage')),
    airbagDeployed: bool(get('airbagDeployed')),
    fireFloodDamage: fireFlood,
    stolen: bool(get('stolen')),
    odometerProblem: bool(get('odometerProblem')),
    titleBrand: get('titleBrand') || 'Normal',
    usHistory: bool(get('usHistory')),
    ownershipTypes: Array.isArray(types) ? types : types ? String(types).split(',').map((s) => s.trim()).filter(Boolean) : bool(get('nonPersonalOwnership')) ? ['Non-personal'] : ['Personal'],
    registrations: previous.registrations ?? [],
    lastRegisteredProvince: get('lastRegisteredProvince') || previous.lastRegisteredProvince || null,
    serviceRecords: previous.serviceRecords ?? null,
    openRecalls: bool(get('openRecalls')),
  };
}

export function carfaxConfigured(env = process.env) {
  return Boolean(env.CARFAX_API_URL && env.CARFAX_API_KEY);
}

export async function enrichCarfax(vehicles, { env = process.env, today, log = console.log, fetchImpl = fetch }) {
  if (!carfaxConfigured(env)) {
    log('carfax: skipped (set CARFAX_API_URL and CARFAX_API_KEY to enable)');
    return { updated: 0, skipped: vehicles.length, failed: 0 };
  }
  if (!env.CARFAX_API_URL.includes('{vin}')) throw new Error('CARFAX_API_URL must contain {vin}');
  const header = env.CARFAX_AUTH_HEADER || 'Authorization';
  const scheme = env.CARFAX_AUTH_SCHEME ?? 'Bearer';
  const auth = scheme ? `${scheme} ${env.CARFAX_API_KEY}` : env.CARFAX_API_KEY;

  let updated = 0, skipped = 0, failed = 0;
  for (const v of vehicles) {
    if (!v.vin || !/^[A-HJ-NPR-Z0-9]{17}$/i.test(v.vin)) {
      skipped++;
      continue;
    }
    const url = env.CARFAX_API_URL.replace('{vin}', encodeURIComponent(v.vin.toUpperCase()));
    try {
      const res = await fetchImpl(url, { headers: { [header]: auth, Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      v.history = mapCarfax(await res.json(), v.history ?? {}, today);
      updated++;
    } catch (e) {
      // Keep the last good history rather than blanking the listing.
      failed++;
      log(`carfax: ${v.id} failed (${e.message}); kept previous history`);
    }
    await new Promise((r) => setTimeout(r, 250)); // stay polite to a metered API
  }
  log(`carfax: ${updated} updated, ${skipped} without a VIN, ${failed} failed`);
  return { updated, skipped, failed };
}
