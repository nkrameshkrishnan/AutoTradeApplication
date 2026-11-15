# Kilometre

A static car buying and comparison app for the Canadian market: CAD pricing, kilometres, L/100 km, and sales tax by province. React + Vite + Tailwind CSS + Lucide, with Motion for interaction. No backend; it deploys straight to GitHub Pages.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # static site in dist/
npm run preview   # serve dist/ locally
```

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository (branch `main`).
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) builds and publishes on every push to `main`.

It works from any sub-path (`username.github.io/<repo>/`) because `vite.config.js` sets `base: './'`, and it never 404s on refresh or deep links because routing uses `HashRouter` (`#/vehicle/<id>`, `#/compare`). `public/.nojekyll` stops Pages from processing the build.

## What's in it

- **Inventory** (`#/`): live dealer listings when `MARKETCHECK_API_KEY` is set (see Live listings), otherwise the samples; the year filter always spans 2010 to next year's model year, whatever is in stock; instant search (make, model, trim, colour, city or feature), body-type counts that double as quick filters (SUV, Sedan, Truck, Hatchback, EV), a filter sidebar (price, year, kilometres, transmission, drivetrain, fuel, source platform) that becomes a bottom sheet on phones, five sorts, and a heart on every car for the Saved cars drawer.
- **Price position**: every car is placed on a strip of similar listings (low, average, high), rated Great deal (5% or more under), Fair price, or Above market (more than 3% over).
- **Compare** (`#/compare`): tick 2–4 cars; a tray at the bottom holds them. The matrix pins its header row, marks the best value in each numeric row, and has a "Highlight differences only" switch. **Copy link** shares a comparison as `#/compare?ids=a,b,c`.
- **Vehicle page** (`#/vehicle/<id>`): photo viewer with thumbnails and arrow keys, specifications, features, a 150-point inspection by area, accident and ownership history, and a link to the original listing.
- **Financing calculator**: down payment, trade-in (deducted before tax), 36–84 month term, APR and province (ON 13% HST, BC 5% GST + 7% PST, AB 5% GST, QC 14.975%, and the rest). Bi-weekly and monthly payments with a breakdown that adds up to the amount financed. The settings drive every card's bi-weekly estimate.
- **Persistence**: compare list, saved cars and calculator settings live in `localStorage` (`kilometre.*.v1`).
- **Motion**: one ease (`cubic-bezier(0.22, 1, 0.36, 1)`), entrances only on first load and on scroll, quick press/hover feedback, tray and drawers that slide; filtering is instant. `prefers-reduced-motion` drops all travel.

## Live listings

By default the repo holds 21 sample listings. To show real ones, the build loads live used-car listings from Canadian dealers through the [MarketCheck Inventory Search API](https://docs.marketcheck.com/docs/api/cars/inventory/inventory-search):

1. Get an API key at developers.marketcheck.com, and check that their terms allow showing listings on a public site.
2. Add it as the repository secret `MARKETCHECK_API_KEY` (Settings → Secrets and variables → Actions).
3. Run the **Deploy to GitHub Pages** workflow, or wait for the daily run.

`scripts/listings.config.json` sets what's fetched: 40 used cars per city within 30 miles of Toronto, Ottawa, Montreal, Calgary and Vancouver, model years 2015 onwards, $5,000–$120,000. That's about 6 listing calls plus one price-stats call per make, model and year (roughly 100–200 calls a day at MarketCheck's per-call rates).

What live listings carry, and what they don't:

- **Real:** price (CAD), kilometres, dealer name, city, phone, link to the dealer's own listing ("View original source listing"), dealer photos, VIN, body, drivetrain, fuel, engine, colour, seats, days listed, and CARFAX one-owner and clean-title flags when the dealer states them.
- **Computed:** the price rating compares each car with all used listings of the same make, model and year across Canada (MarketCheck stats; median, 5th and 95th percentiles). Fewer than five comparables means no rating, and the page says so.
- **Recalls:** matched to each real car's make, model and year from Transport Canada's file.
- **Missing until you connect more sources:** accident details (needs the CARFAX Canada API; the page shows "Accident history not reported"), the 150-point inspection (hidden), horsepower, and an itemised feature list. Features are picked out of the listing headline where it names them.
- **Odometer units:** MarketCheck's docs say `miles` is in miles for Canada too, so it is converted to km. If your account returns kilometres, set the repository variable `MARKETCHECK_ODOMETER_UNIT` to `km`.

If MarketCheck returns no listings, the build fails instead of publishing an empty site, and the last good deployment stays up.

To rehearse live mode without a key: `MARKETCHECK_API_KEY=test node --import ./scripts/dev/mock-marketcheck.mjs scripts/enrich.mjs && npm run dev` (five fake listings shaped like MarketCheck's schema). With a real key: `MARKETCHECK_API_KEY=... npm run enrich && npm run dev`. Either way, put the samples back with `git checkout src/data` rather than committing the fetched data.

## Vehicle history (CARFAX Canada) and recalls

Each listing carries a `history` record shaped after CARFAX Canada's VIN Scan fields (accidents with dates and claims, owners, title brand, total loss, frame damage, airbag, fire/flood, stolen, odometer problems, US history, use, registrations, service records), a `reportUrl`, and a `recalls` list. The vehicle page shows them in **Vehicle history** and **Safety recalls**; cards show the accident and owner summary; Compare adds history rows; the filters add **Vehicle history** (no reported accidents, one owner, personal use only).

The site never fetches CARFAX in the browser: keys would be public and the sites block cross-origin requests. The CARFAX terms of use also prohibit robots and data mining. Data is refreshed at build time instead:

```bash
npm run enrich   # recalls, plus CARFAX if configured
npm test         # pipeline tests (CSV parser, CARFAX mapping, secret handling)
```

The deploy workflow runs this before every build (on each push to `main` and daily at 09:47 UTC). The fetched data goes into the published site, not into git.

- **Recalls** come from Transport Canada's Motor Vehicle Safety Recalls Database (open data, no key). Each car's `recallQuery` names its make, model names as Transport Canada spells them, and model year. Matching is by model year, so the page tells buyers to confirm by VIN with the manufacturer.
- **CARFAX Canada** needs a business API agreement ([VIN Scan Summary or the VHR Order/Look-up API](https://go.carfax.ca/big-solutions)). Once you have it, add repository secrets `CARFAX_API_URL` (a URL template containing `{vin}`) and `CARFAX_API_KEY`, and optionally the variable `CARFAX_AUTH_HEADER` (default `Authorization: Bearer <key>`). `scripts/providers/carfax.mjs` reads fields by their data-dictionary labels; check its `LABELS` map against the response CARFAX sends you. Only listings with a real 17-character `vin` are looked up, so sample listings (`vin: null`) never trigger a paid report.
- **Report links**: put the CARFAX report URL the seller gives on Clutch or AutoTrader into `history.reportUrl` (with `history.source: "listing"`); the page shows an **Open CARFAX Canada report** button.

The 21 sample listings have invented histories (`history.source: "sample"`) and real, current recall lists for their model years.

## Data

`src/data/vehicles.json` holds 21 **sample** listings (model years 2019–2026) across Toronto, Ottawa, Montreal, Calgary and Vancouver, from Clutch, AutoTrader, CarGurus and dealers. Prices, kilometres, market averages, owners, accident notes and inspection notes are invented for demonstration; specs and fuel figures are close to published values but should be checked before any real use. "View original source listing" opens a search on the named platform, not a real listing.

To add a car, copy an entry and keep the fields: `marketAvg`, `marketLow` and `marketHigh` drive the price rating; `fuelCity`/`fuelHwy` (L/100 km) for combustion cars, `evRange` (km) and `evConsumption` (kWh/100 km) for electric ones; `inspection.attention` lists noted items by area.

## Photo credits

Photos are real pictures of each model from Wikimedia Commons, downloaded into `public/images/` so the site has no runtime image dependency. They show the model, not the listed vehicle. Each listing's photo credit appears under its gallery.

| File | Title | Creator | Licence | Source |
| --- | --- | --- | --- | --- |
| `rav4-1.jpg` | 2021 Toyota RAV4 XLE AWD, front right, 05-24-2026 | MercurySable99 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2021_Toyota_RAV4_XLE_AWD,_front_right,_05-24-2026.jpg) |
| `rav4-2.jpg` | 2021 Toyota RAV4 XLE AWD, rear right, 05-24-2026 | MercurySable99 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2021_Toyota_RAV4_XLE_AWD,_rear_right,_05-24-2026.jpg) |
| `civic-1.jpg` | 2022 Honda Civic LX Sedan, front right, 11-02-2022 | MercurySable99 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2022_Honda_Civic_LX_Sedan,_front_right,_11-02-2022.jpg) |
| `civic-2.jpg` | HONDA CIVIC SEDAN (FE,FL) China | Dinkun Chen | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:HONDA_CIVIC_SEDAN_(FE,FL)_China.jpg) |
| `f150-1.jpg` | 2020 Ford F-150 XLT SuperCrew 4x4 with FX4 Off-Road & Chrome Packages, front left, 04-07-2023 | MercurySable99 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2020_Ford_F-150_XLT_SuperCrew_4x4_with_FX4_Off-Road_%26_Chrome_Packages,_front_left,_04-07-2023.jpg) |
| `model3-1.jpg` | Tesla Model 3 Shishi 01 2022-09-06 | JamesYoung8167 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Tesla_Model_3_Shishi_01_2022-09-06.jpg) |
| `model3-2.jpg` | Tesla Model 3 Shishi 02 2022-09-06 | JamesYoung8167 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Tesla_Model_3_Shishi_02_2022-09-06.jpg) |
| `mazda3-1.jpg` | 2019 Mazda3 Hatchback 2.0 BP (20191219) 01 | オーバードライブ83 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2019_Mazda3_Hatchback_2.0_BP_(20191219)_01.jpg) |
| `mazda3-2.jpg` | 2019 Mazda3 Hatchback 2.0 BP (20191219) 02 | オーバードライブ83 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2019_Mazda3_Hatchback_2.0_BP_(20191219)_02.jpg) |
| `kona-1.jpg` | 2019 Hyundai Kona Electric front charging 4.2.18 | Kevauto | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2019_Hyundai_Kona_Electric_front_charging_4.2.18.jpg) |
| `kona-2.jpg` | 2019 Hyundai Kona Electric rear charging 4.2.18 | Kevauto | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2019_Hyundai_Kona_Electric_rear_charging_4.2.18.jpg) |
| `outback-1.jpg` | 2020 Subaru Outback AWD, front | Kevauto | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2020_Subaru_Outback_AWD,_front.jpg) |
| `outback-2.jpg` | 2020 Subaru Outback AWD, rear | Kevauto | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2020_Subaru_Outback_AWD,_rear.jpg) |
| `outback-3.jpg` | Chicago Auto Show 2020. Subaru Outback (49505164238) | Kontinent Media | CC BY 2.0 | [source](https://commons.wikimedia.org/wiki/File:Chicago_Auto_Show_2020._Subaru_Outback_(49505164238).jpg) |
| `camry-1.jpg` | TOYOTA CAMRY HYBRID (XV70) China (10) | Dinkun Chen | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:TOYOTA_CAMRY_HYBRID_(XV70)_China_(10).jpg) |
| `ram1500-1.jpg` | 2019 Ram 1500 Bighorn, front 3.11.20 | Kevauto | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2019_Ram_1500_Bighorn,_front_3.11.20.jpg) |
| `ram1500-2.jpg` | 2019 Ram 1500 Bighorn, rear 3.11.20 | Kevauto | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2019_Ram_1500_Bighorn,_rear_3.11.20.jpg) |
| `telluride-1.jpg` | 2023 Kia Telluride front end | deathpallie325 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2023_Kia_Telluride_front_end.jpg) |
| `telluride-2.jpg` | 2023 Kia Telluride rear end | deathpallie325 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2023_Kia_Telluride_rear_end.jpg) |
| `telluride-3.jpg` | 2023 Kia Telluride interior | deathpallie325 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2023_Kia_Telluride_interior.jpg) |
| `gti-1.jpg` | Volkswagen Golf GTI Mk7 Deep Black Pearl (1) | Damian B Oh | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Volkswagen_Golf_GTI_Mk7_Deep_Black_Pearl_(1).jpg) |
| `gti-2.jpg` | Volkswagen Golf GTI Mk7 Deep Black Pearl (3) | Damian B Oh | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Volkswagen_Golf_GTI_Mk7_Deep_Black_Pearl_(3).jpg) |
| `bolt-1.jpg` | 2021 Chevy Bolt EV 20210730 (1) | Robert T Bell | CC BY 2.0 | [source](https://commons.wikimedia.org/wiki/File:2021_Chevy_Bolt_EV_20210730_(1).jpg) |
| `bolt-2.jpg` | 2021 Chevy Bolt EV 20210730 (2) | Robert T Bell | CC BY 2.0 | [source](https://commons.wikimedia.org/wiki/File:2021_Chevy_Bolt_EV_20210730_(2).jpg) |
| `bolt-3.jpg` | 2021 Chevrolet Bolt EV interior | deathpallie325 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2021_Chevrolet_Bolt_EV_interior.jpg) |
| `bmw330-1.jpg` | BMW 330i G20 Black 1 | Damian B Oh | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:BMW_330i_G20_Black_1.jpg) |
| `bmw330-2.jpg` | BMW 330i G20 Black 3 | Damian B Oh | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:BMW_330i_G20_Black_3.jpg) |
| `bmw330-3.jpg` | BMW 330i G20 Black 2 | Damian B Oh | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:BMW_330i_G20_Black_2.jpg) |
| `mache-1.jpg` | Ford Mustang Mach-E Leonberg 2022 1X7A0434 | Alexander Migl | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Ford_Mustang_Mach-E_Leonberg_2022_1X7A0434.jpg) |
| `tacoma-1.jpg` | 2023 Toyota Tacoma TRD Off-Road Double Cab in Black, front left | Mr.choppers | CC BY-SA 3.0 | [source](https://commons.wikimedia.org/wiki/File:2023_Toyota_Tacoma_TRD_Off-Road_Double_Cab_in_Black,_front_left.jpg) |
| `tacoma-2.jpg` | 2023 Toyota Tacoma TRD Off-Road Double Cab in Black, rear right | Mr.choppers | CC BY-SA 3.0 | [source](https://commons.wikimedia.org/wiki/File:2023_Toyota_Tacoma_TRD_Off-Road_Double_Cab_in_Black,_rear_right.jpg) |
| `crv-1.jpg` | Honda CR-V (6th generation) hybrid 1X7A1956 | Alexander-93 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Honda_CR-V_(6th_generation)_hybrid_1X7A1956.jpg) |
| `crv-2.jpg` | Honda CR-V (6th generation) hybrid 1X7A1957 | Alexander-93 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Honda_CR-V_(6th_generation)_hybrid_1X7A1957.jpg) |
| `ioniq5n-1.jpg` | Hyundai Ioniq 5 N IMG 9390 | Alexander-93 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Hyundai_Ioniq_5_N_IMG_9390.jpg) |
| `ioniq5n-2.jpg` | Hyundai Ioniq 5 N IMG 9406 | Alexander-93 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Hyundai_Ioniq_5_N_IMG_9406.jpg) |
| `maverick-1.jpg` | 2025 Ford Maverick XLT, front 4.15.25 | Kevauto | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2025_Ford_Maverick_XLT,_front_4.15.25.jpg) |
| `civichatch-1.jpg` | 2025 Honda Civic Hybrid (Europe) DSC 2727 | Alexander Migl | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2025_Honda_Civic_Hybrid_(Europe)_DSC_2727.jpg) |
| `civichatch-2.jpg` | 2025 Honda Civic Hybrid (Europe) DSC 2731 | Alexander Migl | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2025_Honda_Civic_Hybrid_(Europe)_DSC_2731.jpg) |
| `camry25-1.jpg` | 2025 Toyota Camry LE, front left, 05-24-2025 | MercurySable99 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2025_Toyota_Camry_LE,_front_left,_05-24-2025.jpg) |
| `camry25-2.jpg` | 2025 Toyota Camry LE, rear left, 05-24-2025 | MercurySable99 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:2025_Toyota_Camry_LE,_rear_left,_05-24-2025.jpg) |
| `crosstrek-1.jpg` | Subaru Crosstrek Wilderness IMG 3719 (cropped) | Alexander Migl | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Subaru_Crosstrek_Wilderness_IMG_3719_(cropped).jpg) |
| `crosstrek-2.jpg` | Subaru Crosstrek Wilderness IMG 3726 (cropped) | Alexander Migl | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Subaru_Crosstrek_Wilderness_IMG_3726_(cropped).jpg) |
