// Rehearse live mode without a MarketCheck key: answers api.marketcheck.com with five listings
// shaped like the documented schema (one with no photos and too few comparables to rate).
//   MARKETCHECK_API_KEY=test node --import ./scripts/dev/mock-marketcheck.mjs scripts/enrich.mjs
// Then `npm run dev`. Restore the samples afterwards with: git checkout src/data
const real = globalThis.fetch;
const P = 'images/'; // bundled photos, so the rehearsal works offline
const cars = [
  ['2T3P1RFV5PW331100', 2023, 'Toyota', 'RAV4', 'XLE', 'SUV', 'Unleaded', 'AWD', 21000, 36990, 'Toronto', 'ON', 'Downtown Toyota', [P + 'rav4-1.jpg', P + 'rav4-2.jpg'], true, true, 'autotrader.ca'],
  ['19XFL2H85PE012345', 2023, 'Honda', 'Civic', 'EX', 'Sedan', 'Unleaded', 'FWD', 18000, 28450, 'Ottawa', 'ON', 'Capital Honda', [P + 'civic-1.jpg'], false, true, 'capitalhonda.ca'],
  ['1FTFW1E84MKD12345', 2021, 'Ford', 'F-150', 'XLT', 'Pickup', 'Unleaded', '4WD', 52000, 44900, 'Calgary', 'AB', 'Northgate Ford', [], null, null, 'northgateford.com'],
  ['KM8K53AG0MU123456', 2021, 'Hyundai', 'Kona Electric', 'Preferred', 'SUV', 'Electric', 'FWD', 30000, 27990, 'Montreal', 'QC', 'Hyundai Centre-Ville', [P + 'kona-1.jpg', P + 'kona-2.jpg'], true, null, 'clutch.ca'],
  ['3MZBPAEM5KM123456', 2019, 'Mazda', 'Mazda3', 'GS', 'Hatchback', 'Unleaded', 'FWD', 40000, 19500, 'Vancouver', 'BC', 'Vancouver Mazda', [P + 'mazda3-1.jpg'], false, false, 'cargurus.ca'],
];
const listing = (c) => ({ id: c[0], vin: c[0], heading: `${c[1]} ${c[2]} ${c[3]} ${c[4]} Heated Seats Apple CarPlay Android Auto`, price: c[9], miles: c[8], dom: 6, dom_active: 4, exterior_color: 'Grey',
  vdp_url: `https://${c[16]}/used/${c[0]}`, source: c[16], carfax_1_owner: c[14], carfax_clean_title: c[15], media: { photo_links: c[13] },
  dealer: { name: c[12], city: c[10].toUpperCase(), state: c[11], phone: '416-555-0100' },
  build: { year: c[1], make: c[2], model: c[3], trim: c[4], body_type: c[5], fuel_type: c[6], drivetrain: c[7], transmission: 'Automatic', engine: c[6] === 'Electric' ? null : '2.0L I4', std_seating: '5', city_mpg: c[6] === 'Electric' ? null : 30, highway_mpg: c[6] === 'Electric' ? null : 38 } });
globalThis.fetch = async (url, init) => {
  const u = new URL(url);
  if (u.hostname !== 'api.marketcheck.com') return real(url, init);
  if (u.searchParams.get('stats')) {
    const model = u.searchParams.get('model');
    if (model === 'F-150') return new Response(JSON.stringify({ stats: { price: { count: 2, mean: 45000, median: 45000, min: 44000, max: 46000 } } }));
    const c = cars.find((x) => x[3] === model);
    return new Response(JSON.stringify({ stats: { price: { count: 140, mean: c[9] * 1.03, median: Math.round(c[9] * 1.04), min: c[9] * 0.8, max: c[9] * 1.3, stddev: c[9] * 0.07, percentiles: { '5.0': Math.round(c[9] * 0.9), '95.0': Math.round(c[9] * 1.18) } } } }));
  }
  const lat = Number(u.searchParams.get('latitude'));
  const city = lat > 50 ? 'Calgary' : lat > 49 ? 'Vancouver' : lat > 45.45 ? 'Montreal' : lat > 45 ? 'Ottawa' : 'Toronto';
  return new Response(JSON.stringify({ num_found: 1, listings: cars.filter((c) => c[10] === city).map(listing) }));
};
