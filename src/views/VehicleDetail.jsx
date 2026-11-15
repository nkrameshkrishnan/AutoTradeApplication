import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ExternalLink, Minus } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import FinanceCalculator from '../components/FinanceCalculator.jsx';
import { Card, PricePosition, RatingBadge } from '../components/ui.jsx';
import { CompareCheck, SaveButton } from '../components/VehicleCard.jsx';
import { EASE, Reveal } from '../components/motion.jsx';
import { useStore } from '../lib/store.jsx';
import { asset, fullTitle, km, listedAgo, money, num, place, cover } from '../lib/format.js';
import { priceRating } from '../lib/finance.js';
import { FLAGS, SOURCE_NOTE, accidentLabel, accidentsKnown, isClean, nonPersonal, ownersLabel } from '../lib/history.js';

const ALL_FEATURES = [
  'Heated front seats', 'Heated steering wheel', 'Heated rear seats', 'Ventilated front seats', 'Panoramic sunroof', 'Sunroof',
  'Adaptive cruise control', 'Apple CarPlay', 'Android Auto', 'Blind-spot monitoring', 'Lane-keep assist', '360° camera',
  'Remote start', 'Leather seats', 'Wireless charging', 'Power liftgate', 'Head-up display', 'Built-in navigation',
  'Tow package', 'Premium audio', 'Third-row seating',
];

// 150 points across seven areas.
const AREAS = [
  ['Exterior', 32],
  ['Interior', 28],
  ['Under hood', 24],
  ['Undercarriage', 20],
  ['Tires & brakes', 18],
  ['Electrical', 16],
  ['Road test', 12],
];
const RECONDITIONED = ['Replaced', 'Repaired', 'Treated', 'Resurfaced', 'Resealed', 'Touched up'];

function Gallery({ v }) {
  const [i, setI] = useState(0);
  const imgs = v.images.length ? v.images : [{ src: 'images/no-photo.svg', alt: 'No photo from the dealer', credit: null }];
  const img = imgs[i];
  const go = (d) => setI((n) => (n + d + imgs.length) % imgs.length);
  return (
    <figure className="m-0">
      <div
        className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-card)] bg-raised"
        tabIndex={imgs.length > 1 ? 0 : undefined}
        aria-label={imgs.length > 1 ? `Photo ${i + 1} of ${imgs.length}. Use the arrow keys to browse.` : undefined}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(1);
          if (e.key === 'ArrowLeft') go(-1);
        }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.img
            key={img.src}
            src={asset(img.src)}
            alt={img.alt}
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
          />
        </AnimatePresence>
        {imgs.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute top-1/2 left-3 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-ink hover:bg-raised">
              <ChevronLeft size={18} strokeWidth={1.8} />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute top-1/2 right-3 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-ink hover:bg-raised">
              <ChevronRight size={18} strokeWidth={1.8} />
            </button>
            <span className="num absolute bottom-3 left-3 rounded-full bg-surface px-2.5 py-0.5 text-xs text-ink">
              {i + 1} / {imgs.length}
            </span>
          </>
        )}
      </div>
      {imgs.length > 1 && (
        <div className="mt-3 flex gap-2" role="tablist" aria-label="Photos">
          {imgs.map((im, n) => (
            <button
              key={im.src}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={`Photo ${n + 1}`}
              onClick={() => setI(n)}
              className={`relative h-16 w-24 flex-none overflow-hidden rounded-[6px] transition-opacity ${n === i ? 'opacity-100 ring-2 ring-ink ring-offset-2 ring-offset-ground' : 'opacity-70 hover:opacity-100'}`}
            >
              <img src={asset(im.src)} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {img.credit && (
        <figcaption className="mt-2 text-xs text-muted">
          {img.credit.license ? (
            <>
              Photo: <a href={img.credit.source} target="_blank" rel="noreferrer" className="text-muted underline hover:text-ink">{img.credit.creator}</a>, {img.credit.license}, via Wikimedia Commons. Representative of this model; not the listed vehicle.
            </>
          ) : (
            <>Photos from {img.credit.creator}&rsquo;s listing.</>
          )}
        </figcaption>
      )}
    </figure>
  );
}

function Specs({ v }) {
  const rows = [
    ['Odometer', km(v.odometer)],
    ['Body type', v.bodyType],
    ['Engine', v.engine ?? '—'],
    ['Horsepower', v.horsepower ? `${v.horsepower} hp` : '—'],
    ['Transmission', v.transmissionDetail],
    ['Drivetrain', v.drivetrain],
    ['Fuel type', v.fuelType],
    v.fuelType === 'Electric'
      ? ['Range', v.evRange ? `${num(v.evRange)} km${v.evConsumption ? ` · ${v.evConsumption.toFixed(1)} kWh/100 km` : ''}` : '—']
      : ['Fuel economy', v.fuelCity && v.fuelHwy ? `${v.fuelCity.toFixed(1)} city · ${v.fuelHwy.toFixed(1)} hwy L/100 km` : '—'],
    ['Exterior colour', v.colour ?? '—'],
    ['Seats', v.seats ? String(v.seats) : '—'],
  ];
  return (
    <Card className="p-5">
      <h2 className="text-base font-medium">Specifications</h2>
      <dl className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {rows.map(([k, val]) => (
          <div key={k} className="flex min-h-10 items-center justify-between gap-4 border-b border-rule py-2 text-sm">
            <dt className="text-muted">{k}</dt>
            <dd className="num text-right text-ink">{val}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function Features({ v }) {
  const has = new Set(v.features);
  const missing = ALL_FEATURES.filter((f) => !has.has(f));
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-medium">Features</h2>
        <span className="num text-xs text-muted">{v.features.length} of {ALL_FEATURES.length} tracked</span>
      </div>
      {v.features.length === 0 && <p className="mt-2 text-sm text-muted">The dealer&rsquo;s listing doesn&rsquo;t itemise features. Check the original listing or ask the dealer.</p>}
      <ul className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {v.features.map((f) => (
          <li key={f} className="flex h-8 items-center gap-2.5 text-sm text-ink">
            <Check size={15} strokeWidth={2} className="flex-none" aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>
      <details className="group mt-3 text-sm">
        <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1 text-muted hover:text-ink">
          <ChevronRight size={14} strokeWidth={1.8} className="transition-transform group-open:rotate-90" aria-hidden="true" />
          Not equipped ({missing.length})
        </summary>
        <ul className="mt-1 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          {missing.map((f) => (
            <li key={f} className="flex h-8 items-center gap-2.5 text-muted">
              <Minus size={15} strokeWidth={1.8} className="flex-none" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}

function Inspection({ v }) {
  if (!v.inspection) return null;
  const att = v.inspection.attention;
  const noted = att.length;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-medium">150-point inspection</h2>
        <p className="num text-xs text-muted">
          {150 - noted} passed · {noted} noted
        </p>
      </div>
      <table className="num mt-3 w-full text-sm">
        <caption className="sr-only">Inspection results by area</caption>
        <thead>
          <tr className="text-xs text-muted">
            <th scope="col" className="h-9 text-left font-normal">Area</th>
            <th scope="col" className="h-9 text-right font-normal">Points</th>
            <th scope="col" className="h-9 pl-4 text-right font-normal">Result</th>
          </tr>
        </thead>
        <tbody>
          {AREAS.map(([area, pts]) => {
            const items = att.filter((a) => a.area === area);
            return (
              <tr key={area} className="border-t border-rule align-top">
                <th scope="row" className="py-2.5 text-left font-normal text-ink">
                  {area}
                  {items.map((it) => (
                    <span key={it.item} className="mt-1 block text-xs text-muted">
                      {it.item}: <span className="text-ink">{it.outcome.toLowerCase()}</span>
                    </span>
                  ))}
                </th>
                <td className="py-2.5 text-right text-muted">{pts}</td>
                <td className="py-2.5 pl-4 text-right whitespace-nowrap">
                  {items.length === 0 ? (
                    <span className="inline-flex items-center gap-1 text-ink">
                      <Check size={14} strokeWidth={2} aria-hidden="true" /> All passed
                    </span>
                  ) : (
                    <span className="text-ink">
                      {items.length} noted
                      {items.some((it) => RECONDITIONED.includes(it.outcome)) && <span className="block text-xs text-muted">reconditioned</span>}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function Flag({ value }) {
  if (value === true) return <span className="font-medium text-warn-ink">Reported</span>;
  if (value === false) return <span className="text-ink">None</span>;
  return <span className="text-muted">Not reported</span>;
}

function History({ v }) {
  const h = v.history;
  const clean = isClean(h);
  const np = nonPersonal(h);
  const report = h?.reportUrl;
  return (
    <Card className="p-5" aria-labelledby="history-h">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="history-h" className="text-base font-medium">Vehicle history</h2>
        <p className="num text-xs text-muted">{h.provider} · as of {h.asOf}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${clean ? 'bg-pos-bg text-pos-ink' : accidentsKnown(h) ? 'bg-warn-bg text-warn-ink' : 'bg-neu-bg text-neu-ink'}`}>{accidentLabel(h)}</span>
        <span className="inline-flex h-6 items-center rounded-full bg-neu-bg px-2.5 text-xs font-medium text-neu-ink">{ownersLabel(h)}</span>
        <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${h.titleBrand == null || h.titleBrand === 'Normal' ? 'bg-neu-bg text-neu-ink' : 'bg-warn-bg text-warn-ink'}`}>
          {h.titleBrand == null ? 'Title brand not reported' : h.titleBrand === 'Normal' ? 'Clean title' : `${h.titleBrand} title`}
        </span>
      </div>

      {h.accidents?.length > 0 && (
        <ol className="mt-4 border-l-2 border-line pl-4">
          {h.accidents.map((a) => (
            <li key={a.date + a.description} className="relative pb-3 text-sm last:pb-0">
              <span className="absolute top-1.5 -left-[21px] h-2 w-2 rounded-full bg-warn-ink" aria-hidden="true" />
              <p className="num text-ink">
                {a.date}
                {a.province ? ` · ${a.province}` : ''}
                {a.claim != null ? ` · ${money(a.claim)} claim` : ''}
              </p>
              <p className="text-muted">{a.description}</p>
            </li>
          ))}
        </ol>
      )}

      <dl className="mt-4 grid grid-cols-1 gap-x-8 text-sm sm:grid-cols-2">
        {FLAGS.map(([key, label]) => (
          <div key={key} className="flex min-h-10 items-center justify-between gap-4 border-b border-rule py-2">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right">
              <Flag value={h[key]} />
            </dd>
          </div>
        ))}
        <div className="flex min-h-10 items-center justify-between gap-4 border-b border-rule py-2">
          <dt className="text-muted">Use</dt>
          <dd className="text-right text-ink">{np.length ? `${np.join(', ')}, then personal` : h.ownershipTypes?.length ? 'Personal' : '—'}</dd>
        </div>
        <div className="flex min-h-10 items-center justify-between gap-4 border-b border-rule py-2">
          <dt className="text-muted">Registered in</dt>
          <dd className="num text-right text-ink">{h.registrations?.length ? h.registrations.join(', ') : '—'}</dd>
        </div>
        <div className="flex min-h-10 items-center justify-between gap-4 border-b border-rule py-2 sm:border-0">
          <dt className="text-muted">Service records</dt>
          <dd className="num text-right text-ink">{h.serviceRecords ?? '—'}</dd>
        </div>
        <div className="flex min-h-10 items-center justify-between gap-4 py-2">
          <dt className="text-muted">VIN</dt>
          <dd className="num text-right text-ink">{v.vin ?? 'Not provided'}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {report ? (
          <a href={report} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-3.5 text-sm font-medium text-white no-underline">
            Open CARFAX Canada report
            <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
          </a>
        ) : (
          <a href="https://www.carfax.ca/" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-control bg-surface px-3.5 text-sm font-medium text-ink no-underline hover:border-[#aeb4bb]">
            Order a report on carfax.ca
            <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
          </a>
        )}
        <p className="text-xs text-muted">{report ? 'Opens the full report the seller attached to this listing.' : 'This listing has no CARFAX report link yet.'}</p>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">{SOURCE_NOTE[h.source] ?? ''} A history report covers only what was reported to CARFAX Canada; pair it with an inspection.</p>
    </Card>
  );
}

function Recalls({ v }) {
  const r = v.recalls;
  const [open, setOpen] = useState(false);
  if (!r) return null;
  const items = open ? r.items : r.items.slice(0, 3);
  return (
    <Card className="p-5" aria-labelledby="recalls-h">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="recalls-h" className="text-base font-medium">Safety recalls</h2>
        <p className="num text-xs text-muted">{r.source} · as of {r.asOf}</p>
      </div>
      <p className="mt-1 text-sm text-ink">
        {r.items.length === 0
          ? `No recalls issued for the ${v.year} ${v.make} ${v.model}.`
          : `${r.items.length} ${r.items.length === 1 ? 'recall' : 'recalls'} issued for the ${v.year} ${v.make} ${v.model}.`}
      </p>
      {r.items.length > 0 && (
        <p className="mt-1 text-xs leading-5 text-muted">
          A recall may cover only some cars from a model year. Ask the seller for the VIN and check it with {v.make}&rsquo;s recall lookup to see whether this car is affected and already fixed.
        </p>
      )}
      {r.items.length > 0 && (
        <ul className="mt-3">
          {items.map((it) => (
            <li key={it.number} className="border-t border-rule py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-medium text-ink">{it.system ? it.system.charAt(0) + it.system.slice(1).toLowerCase() : 'Recall'}</p>
                <p className="num text-xs text-muted">
                  {it.number} · {it.date}
                </p>
              </div>
              <p className="mt-1 line-clamp-3 text-muted">{it.summary.replace(/^Issue\s*:\s*/i, '')}</p>
            </li>
          ))}
        </ul>
      )}
      {r.items.length > 3 && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 inline-flex h-8 items-center text-sm text-ink underline hover:no-underline">
          {open ? 'Show fewer' : `Show all ${r.items.length}`}
        </button>
      )}
      <p className="mt-2 text-xs text-muted">
        Source:{' '}
        <a href={r.url} target="_blank" rel="noreferrer" className="text-muted underline hover:text-ink">
          {r.dataset}
        </a>
        , Transport Canada open data.
      </p>
    </Card>
  );
}

export default function VehicleDetail() {
  const { id } = useParams();
  const { byId } = useStore();
  const v = byId(id);
  useEffect(() => {
    window.scrollTo(0, 0); // braces matter: Chrome now returns a Promise from scrollTo, and React would call it as a cleanup
  }, [id]);

  if (!v)
    return (
      <Shell title="Listing not found">
        <div className="mx-auto max-w-[1200px]">
          <h1 className="text-2xl leading-8 font-medium">Listing not found</h1>
          <p className="mt-1 text-sm text-muted">This car may have sold or the link is incomplete.</p>
          <Link to="/" className="mt-4 inline-flex h-9 items-center rounded-[6px] bg-primary px-3.5 text-sm font-medium text-white no-underline">
            Browse inventory
          </Link>
        </div>
      </Shell>
    );

  const r = priceRating(v);
  const name = fullTitle(v);

  return (
    <Shell title={`${v.year} ${v.make} ${v.model}`}>
      <div className="mx-auto max-w-[1200px]">
        <Link to="/" className="inline-flex h-8 items-center gap-1.5 rounded-[6px] text-sm text-muted no-underline hover:text-ink">
          <ArrowLeft size={15} strokeWidth={1.8} aria-hidden="true" /> Inventory
        </Link>

        <Reveal hero className="mt-3">
          <Card as="header" className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <img src={asset(cover(v))} alt="" className="hidden h-[62px] w-[92px] flex-none rounded-[6px] object-cover sm:block" />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl leading-8 font-medium tracking-[-0.02em]">{name}</h1>
              <p className="num mt-0.5 text-[13px] text-muted">
                {km(v.odometer)} · {place(v)} · listed {v.dealer?.name ? `by ${v.dealer.name}` : `on ${v.source}`} {listedAgo(v.listedDays ?? 0)}
                {v.dealer?.phone && (
                  <>
                    {' · '}
                    <a href={`tel:${v.dealer.phone}`} className="text-muted underline hover:text-ink">{v.dealer.phone}</a>
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CompareCheck id={v.id} name={name} />
              <SaveButton id={v.id} name={name} />
              {v.sourceUrl && <a
                href={v.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-control bg-surface px-3.5 text-sm font-medium text-ink no-underline hover:border-[#aeb4bb]"
              >
                View original source listing
                <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
              </a>}
            </div>
          </Card>
        </Reveal>

        {/* One flow on phones (photo, price, payment, then the record); two columns from lg. */}
        <div className="mt-4 flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
            <Reveal hero media delay={0.1} className="order-1 lg:order-none">
              <Gallery v={v} />
            </Reveal>
            <Reveal className="order-6 lg:order-none">
              <Specs v={v} />
            </Reveal>
            <Reveal className="order-7 lg:order-none">
              <Features v={v} />
            </Reveal>
            {v.inspection && (
              <Reveal className="order-8 lg:order-none">
                <Inspection v={v} />
              </Reveal>
            )}
            <Reveal className="order-3 lg:order-none">
              <History v={v} />
            </Reveal>
          </div>

          <div className="contents lg:flex lg:flex-col lg:gap-4">
            <Reveal hero delay={0.1} className="order-2 lg:order-none">
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">Listed price</p>
                    <p className="num text-2xl leading-8 font-bold tracking-[-0.01em]">{money(v.price)}</p>
                  </div>
                  <RatingBadge vehicle={v} />
                </div>
                <div className="mt-4">
                  <PricePosition vehicle={v} detailed />
                </div>
                <p className="mt-3 text-xs leading-5 text-muted">
                  {r.key === 'none' ? (
                    'Price ratings need at least five comparable listings for this model year.'
                  ) : (
                    <>
                      Compared with {v.marketBasis ?? `${v.make} ${v.model} listings within two model years and 25,000 km`}.{' '}
                      {r.key === 'great' ? 'Five percent or more under the average counts as a great deal.' : r.key === 'fair' ? 'Within 3% over to 5% under the average counts as fair.' : 'More than 3% over the average; there may be room to negotiate.'}
                    </>
                  )}
                </p>
              </Card>
            </Reveal>
            <Reveal hero delay={0.2} className="order-4 lg:order-none">
              <FinanceCalculator vehicle={v} />
            </Reveal>
            <Reveal className="order-5 lg:order-none">
              <Recalls v={v} />
            </Reveal>
          </div>
        </div>
      </div>
    </Shell>
  );
}
