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
import { asset, fullTitle, km, listedAgo, money, num, place } from '../lib/format.js';
import { priceRating } from '../lib/finance.js';

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
  const imgs = v.images;
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
      <figcaption className="mt-2 text-xs text-muted">
        Photo: <a href={img.credit.source} target="_blank" rel="noreferrer" className="text-muted underline hover:text-ink">{img.credit.creator}</a>, {img.credit.license}, via Wikimedia Commons. Representative of this model; not the listed vehicle.
      </figcaption>
    </figure>
  );
}

function Specs({ v }) {
  const rows = [
    ['Odometer', km(v.odometer)],
    ['Body type', v.bodyType],
    ['Engine', v.engine],
    ['Horsepower', `${v.horsepower} hp`],
    ['Transmission', v.transmissionDetail],
    ['Drivetrain', v.drivetrain],
    ['Fuel type', v.fuelType],
    v.fuelType === 'Electric'
      ? ['Range', `${num(v.evRange)} km · ${v.evConsumption.toFixed(1)} kWh/100 km`]
      : ['Fuel economy', `${v.fuelCity.toFixed(1)} city · ${v.fuelHwy.toFixed(1)} hwy L/100 km`],
    ['Exterior colour', v.colour],
    ['Seats', String(v.seats)],
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

function History({ v }) {
  const clean = v.accidents === 0;
  const recall = v.inspection.attention.find((a) => /recall/i.test(a.item));
  return (
    <Card className="p-5">
      <h2 className="text-base font-medium">Accident and ownership history</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${clean ? 'bg-pos-bg text-pos-ink' : 'bg-warn-bg text-warn-ink'}`}>
          Carfax: {v.carfax}
        </span>
        <span className="inline-flex h-6 items-center rounded-full bg-neu-bg px-2.5 text-xs font-medium text-neu-ink">
          {v.owners} previous {v.owners === 1 ? 'owner' : 'owners'}
        </span>
      </div>
      <dl className="mt-3 text-sm">
        {[
          ['Reported accidents', clean ? '0' : `${v.accidents}, ${v.carfaxNote.toLowerCase()}`],
          ['Registered in', `${v.city}, ${v.province}`],
          ['Open recalls', recall ? 'None, battery recall completed' : 'None reported'],
          ['Theft or salvage records', 'None'],
        ].map(([k, val]) => (
          <div key={k} className="flex min-h-10 items-center justify-between gap-4 border-b border-rule py-2 last:border-0">
            <dt className="text-muted">{k}</dt>
            <dd className="num text-right text-ink">{val}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export default function VehicleDetail() {
  const { id } = useParams();
  const { byId } = useStore();
  const v = byId(id);
  useEffect(() => window.scrollTo(0, 0), [id]);

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
            <img src={asset(v.images[0].src)} alt="" className="hidden h-[62px] w-[92px] flex-none rounded-[6px] object-cover sm:block" />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl leading-8 font-medium tracking-[-0.02em]">{name}</h1>
              <p className="num mt-0.5 text-[13px] text-muted">
                {km(v.odometer)} · {place(v)} · listed on {v.source} {listedAgo(v.listedDays)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CompareCheck id={v.id} name={name} />
              <SaveButton id={v.id} name={name} />
              <a
                href={v.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-control bg-surface px-3.5 text-sm font-medium text-ink no-underline hover:border-[#aeb4bb]"
              >
                View original source listing
                <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
              </a>
            </div>
          </Card>
        </Reveal>

        {/* One flow on phones (photo, price, payment, then the record); two columns from lg. */}
        <div className="mt-4 flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
            <Reveal hero media delay={0.1} className="order-1 lg:order-none">
              <Gallery v={v} />
            </Reveal>
            <Reveal className="order-4 lg:order-none">
              <Specs v={v} />
            </Reveal>
            <Reveal className="order-5 lg:order-none">
              <Features v={v} />
            </Reveal>
            <Reveal className="order-6 lg:order-none">
              <Inspection v={v} />
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
                  Compared with {v.model} listings within two model years and 25,000 km.{' '}
                  {r.key === 'great' ? 'Five percent or more under the average counts as a great deal.' : r.key === 'fair' ? 'Within 3% over to 5% under the average counts as fair.' : 'More than 3% over the average; there may be room to negotiate.'}
                </p>
              </Card>
            </Reveal>
            <Reveal hero delay={0.2} className="order-3 lg:order-none">
              <FinanceCalculator vehicle={v} />
            </Reveal>
            <Reveal className="order-7 lg:order-none">
              <History v={v} />
            </Reveal>
          </div>
        </div>
      </div>
    </Shell>
  );
}
