import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Link2, Minus, Plus, X } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { Button, Card, RatingBadge, Switch } from '../components/ui.jsx';
import { Reveal, PressButton } from '../components/motion.jsx';
import { useStore, MAX_COMPARE } from '../lib/store.jsx';
import { calculateFinance, priceRating } from '../lib/finance.js';
import { asset, km, money, signedMoney, title } from '../lib/format.js';

function pill(cls, text) {
  return <span className={`inline-flex h-6 flex-none items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium ${cls}`}>{text}</span>;
}

// Each row: label, how to show a car's value, a comparable key, and which end is better.
function buildSections(cars, finance) {
  const allEV = cars.every((c) => c.fuelType === 'Electric');
  const noneEV = cars.every((c) => c.fuelType !== 'Electric');
  const features = [...new Set(cars.flatMap((c) => c.features))].sort();
  return [
    {
      name: 'Pricing and source',
      rows: [
        { label: 'Listed price', key: (c) => c.price, show: (c) => <span className="font-bold">{money(c.price)}</span>, best: 'min' },
        { label: 'Bi-weekly estimate', key: (c) => calculateFinance(c.price, finance).biweekly, show: (c) => money(calculateFinance(c.price, finance).biweekly), best: 'min' },
        { label: 'Price rating', key: (c) => priceRating(c).key, show: (c) => <RatingBadge vehicle={c} /> },
        { label: 'Against similar listings', key: (c) => c.price - c.marketAvg, show: (c) => signedMoney(c.price - c.marketAvg), best: 'min' },
        { label: 'Listed on', key: (c) => c.source, show: (c) => c.source },
      ],
    },
    {
      name: 'Specs and efficiency',
      rows: [
        { label: 'Engine', key: (c) => c.engine, show: (c) => c.engine },
        { label: 'Horsepower', key: (c) => c.horsepower, show: (c) => `${c.horsepower} hp`, best: 'max' },
        { label: 'Transmission', key: (c) => c.transmissionDetail, show: (c) => c.transmissionDetail },
        { label: 'Drivetrain', key: (c) => c.drivetrain, show: (c) => c.drivetrain },
        { label: 'Fuel type', key: (c) => c.fuelType, show: (c) => c.fuelType },
        {
          label: 'Fuel economy',
          key: (c) => (c.fuelType === 'Electric' ? null : c.fuelCity),
          show: (c) => (c.fuelType === 'Electric' ? <span className="text-muted">—</span> : `${c.fuelCity.toFixed(1)} city · ${c.fuelHwy.toFixed(1)} hwy L/100 km`),
          best: noneEV ? 'min' : null,
        },
        {
          label: 'Electric range',
          key: (c) => (c.fuelType === 'Electric' ? c.evRange : null),
          show: (c) => (c.fuelType === 'Electric' ? `${c.evRange} km` : <span className="text-muted">—</span>),
          best: allEV ? 'max' : null,
        },
      ],
    },
    {
      name: 'Condition and history',
      rows: [
        { label: 'Odometer', key: (c) => c.odometer, show: (c) => km(c.odometer), best: 'min' },
        { label: 'Model year', key: (c) => c.year, show: (c) => String(c.year), best: 'max', bestLabel: 'Newest' },
        {
          label: 'Carfax',
          key: (c) => c.carfax,
          show: (c) => (c.accidents === 0 ? pill('bg-pos-bg text-pos-ink', c.carfax) : pill('bg-warn-bg text-warn-ink', c.carfax)),
        },
        { label: 'Previous owners', key: (c) => c.owners, show: (c) => String(c.owners), best: 'min', bestLabel: 'Fewest' },
        { label: 'Inspection notes', key: (c) => c.inspection.attention.length, show: (c) => `${c.inspection.attention.length} of 150 points`, best: 'min', bestLabel: 'Fewest' },
      ],
    },
    {
      name: 'Features',
      rows: features.map((f) => ({
        label: f,
        key: (c) => c.features.includes(f),
        show: (c) =>
          c.features.includes(f) ? (
            <Check size={16} strokeWidth={2} aria-label="Included" />
          ) : (
            <Minus size={16} strokeWidth={1.8} className="text-[#9aa0a7]" aria-label="Not included" />
          ),
      })),
    },
  ];
}

function bestIndexes(row, cars) {
  if (!row.best) return new Set();
  const vals = cars.map((c) => row.key(c));
  const nums = vals.filter((v) => typeof v === 'number');
  if (nums.length < 2) return new Set();
  const target = row.best === 'min' ? Math.min(...nums) : Math.max(...nums);
  if (nums.every((n) => n === target)) return new Set();
  return new Set(vals.map((v, i) => (v === target ? i : -1)).filter((i) => i >= 0));
}

function EmptyCompare() {
  const { vehicles, compare, toggleCompare, byId } = useStore();
  const picked = compare.map(byId).filter(Boolean);
  const suggestions = vehicles
    .filter((v) => !compare.includes(v.id))
    .sort((a, b) => a.price / a.marketAvg - b.price / b.marketAvg)
    .slice(0, 4);
  return (
    <Card className="mt-6 p-5">
      <h2 className="text-base font-medium">Pick at least two cars</h2>
      <p className="mt-1 text-sm text-muted">
        {picked.length === 1 ? `${title(picked[0])} is waiting. Add one more from the best-priced listings below, or browse the inventory.` : 'Tick Compare on up to four listings, or start with the best-priced cars right now.'}
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {suggestions.map((v) => (
          <li key={v.id} className="flex items-center gap-3 rounded-[8px] border border-line p-2">
            <img src={asset(v.images[0].src)} alt="" className="h-12 w-[72px] flex-none rounded-[5px] object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{title(v)}</p>
              <p className="num text-xs text-muted">
                {money(v.price)} · {signedMoney(v.price - v.marketAvg)}
              </p>
            </div>
            <PressButton type="button" onClick={() => toggleCompare(v.id)} aria-label={`Add ${title(v)} to compare`} className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-[6px] border border-control hover:border-[#aeb4bb]">
              <Plus size={16} strokeWidth={1.8} />
            </PressButton>
          </li>
        ))}
      </ul>
      <Link to="/" className="mt-4 inline-flex h-9 items-center rounded-[6px] bg-primary px-3.5 text-sm font-medium text-white no-underline">
        Browse inventory
      </Link>
    </Card>
  );
}

export default function Compare() {
  const { compare, byId, toggleCompare, clearCompare, setCompareList, finance } = useStore();
  const [diffOnly, setDiffOnly] = useState(false);
  const [copied, setCopied] = useState(false);
  const [params, setParams] = useSearchParams();

  // A shared link (#/compare?ids=a,b,c) replaces the tray with its cars, once.
  useEffect(() => {
    const ids = params.get('ids');
    if (ids) {
      setCompareList(ids.split(','));
      setParams({}, { replace: true });
    }
  }, [params, setParams, setCompareList]);

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/compare?ids=${compare.join(',')}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this link', url);
    }
  };
  const cars = compare.map(byId).filter(Boolean);
  const sections = useMemo(() => buildSections(cars, finance), [cars, finance]);

  const isDifferent = (row) => new Set(cars.map((c) => String(row.key(c)))).size > 1;
  const totalRows = sections.reduce((n, s) => n + s.rows.length, 0);
  const diffRows = sections.reduce((n, s) => n + s.rows.filter(isDifferent).length, 0);
  const cheapest = cars.length ? cars.reduce((a, b) => (a.price <= b.price ? a : b)) : null;

  return (
    <Shell title="Compare">
      <div className="mx-auto max-w-[1200px]">
        <Reveal hero className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl leading-8 font-medium tracking-[-0.02em]">Compare</h1>
            <p className="num mt-1 text-sm text-muted">
              {cars.length < 2
                ? `${cars.length} of ${MAX_COMPARE} selected`
                : `${cars.length} cars · ${diffRows} of ${totalRows} rows differ · ${title(cheapest)} is the lowest price`}
            </p>
          </div>
          {cars.length >= 2 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Switch checked={diffOnly} onChange={setDiffOnly} label="Highlight differences only" />
              <Button onClick={share} aria-live="polite">
                <Link2 size={15} strokeWidth={1.8} aria-hidden="true" />
                {copied ? 'Link copied' : 'Copy link'}
              </Button>
              <Button variant="ghost" onClick={clearCompare}>
                Clear all
              </Button>
            </div>
          )}
        </Reveal>

        {cars.length < 2 ? (
          <EmptyCompare />
        ) : (
          <Reveal hero delay={0.1} className="mt-6">
            {/* Below lg the frame scrolls both ways so the header row stays pinned; above it the page scrolls. */}
            <div className="max-h-[calc(100dvh-140px)] overflow-auto rounded-[var(--radius-card)] border border-line bg-surface lg:max-h-none lg:overflow-visible">
              <table className="num w-full table-fixed border-separate border-spacing-0 text-sm" style={{ minWidth: 140 + cars.length * 180 }}>
                <caption className="sr-only">Side-by-side comparison of {cars.length} vehicles</caption>
                <colgroup>
                  <col className="w-[140px] sm:w-[200px]" />
                  {cars.map((c) => (
                    <col key={c.id} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col" className="sticky top-0 left-0 z-30 rounded-tl-[8px] border-b border-line bg-surface p-3 text-left align-bottom text-xs font-normal text-muted lg:top-0">
                      {cars.length} of {MAX_COMPARE}
                    </th>
                    {cars.map((c) => (
                      <th key={c.id} scope="col" className="sticky top-0 z-20 border-b border-line bg-surface p-3 text-left align-top font-normal last:rounded-tr-[8px]">
                        <div className="relative">
                          <img src={asset(c.images[0].src)} alt="" className="aspect-[3/2] w-full rounded-[6px] object-cover" />
                          <button
                            type="button"
                            onClick={() => toggleCompare(c.id)}
                            aria-label={`Remove ${title(c)} from compare`}
                            className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface hover:bg-raised"
                          >
                            <X size={14} strokeWidth={1.8} />
                          </button>
                        </div>
                        <Link to={`/vehicle/${c.id}`} className="mt-2 block text-sm font-medium text-ink no-underline hover:underline">
                          {title(c)}
                        </Link>
                        <span className="block truncate text-xs text-muted">{c.trim}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sections.map((s) => {
                    const rows = diffOnly ? s.rows.filter(isDifferent) : s.rows;
                    return (
                      <Fragment key={s.name}>
                        <tr>
                          <th scope="colgroup" colSpan={cars.length + 1} className="sticky left-0 bg-surface px-3 pt-6 pb-2 text-left text-[13px] font-medium text-ink">
                            {s.name}
                            {diffOnly && <span className="ml-2 font-normal text-muted">{rows.length === 0 ? 'no differences' : `${rows.length} of ${s.rows.length} differ`}</span>}
                          </th>
                        </tr>
                        {rows.map((row) => {
                          const best = bestIndexes(row, cars);
                          const diff = isDifferent(row);
                          return (
                            <tr key={row.label} className="group">
                              <th scope="row" className="sticky left-0 z-10 border-t border-rule bg-surface px-3 py-2.5 text-left font-normal text-muted">
                                {row.label}
                              </th>
                              {cars.map((c, i) => (
                                <td key={c.id} className={`border-t border-rule px-3 py-2.5 align-middle text-ink ${diff && diffOnly ? 'bg-[#f7f9fc]' : ''}`}>
                                  <span className="inline-flex items-center gap-2">
                                    {row.show(c)}
                                    {best.has(i) && <span className="text-xs font-medium text-positive">{row.bestLabel ?? (row.best === 'min' ? 'Lowest' : 'Highest')}</span>}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Reveal>
        )}
      </div>
    </Shell>
  );
}
