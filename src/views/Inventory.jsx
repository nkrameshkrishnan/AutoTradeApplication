import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import VehicleCard from '../components/VehicleCard.jsx';
import { Button } from '../components/ui.jsx';
import { EASE, Reveal } from '../components/motion.jsx';
import { useStore } from '../lib/store.jsx';
import { BODY_TYPES, BOUNDS, EMPTY_FILTERS, SORTS, activeFilterCount, facetCounts, matches, sortList } from '../lib/filters.js';
import { priceRating } from '../lib/finance.js';
import { money, num } from '../lib/format.js';
import meta from '../data/meta.json';

const refreshed = meta.refreshedAt
  ? new Intl.DateTimeFormat('en-CA', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' }).format(new Date(meta.refreshedAt))
  : null;

// Filters live for the session (and survive a trip to a listing and back), not across sessions.
let sessionFilters = EMPTY_FILTERS;
let sessionSort = 'best';

function BodyCounts({ filters, setFilters, list }) {
  const counts = facetCounts(list, filters, 'body', BODY_TYPES);
  return (
    <div role="radiogroup" aria-label="Body type" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {BODY_TYPES.map((b) => {
        const on = filters.body === b;
        return (
          <button
            key={b}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setFilters((f) => ({ ...f, body: b }))}
            className={`flex h-11 min-w-0 items-center justify-between gap-2 rounded-[var(--radius-card)] border px-3 text-left transition-colors sm:h-[61px] sm:flex-col sm:items-start sm:justify-center sm:gap-0.5 ${
              on ? 'border-ink bg-raised outline outline-[0.5px] outline-ink' : 'border-line bg-surface hover:border-[#cdd2d8]'
            }`}
          >
            <span className={`truncate text-[13px] ${on ? 'text-ink' : 'text-muted'}`}>
              {b === 'All' ? (
                <>
                  All<span className="hidden sm:inline"> vehicles</span>
                </>
              ) : (
                b
              )}
            </span>
            <span className="num text-sm font-medium text-ink sm:text-base">{counts[b]}</span>
          </button>
        );
      })}
    </div>
  );
}

function ActiveChips({ filters, setFilters }) {
  const chips = [];
  if (filters.priceMin !== BOUNDS.priceMin || filters.priceMax !== BOUNDS.priceMax)
    chips.push({ key: 'price', label: `${money(filters.priceMin)} – ${money(filters.priceMax)}`, clear: (f) => ({ ...f, priceMin: BOUNDS.priceMin, priceMax: BOUNDS.priceMax }) });
  if (filters.yearMin !== BOUNDS.yearMin || filters.yearMax !== BOUNDS.yearMax)
    chips.push({ key: 'year', label: `${filters.yearMin}–${filters.yearMax}`, clear: (f) => ({ ...f, yearMin: BOUNDS.yearMin, yearMax: BOUNDS.yearMax }) });
  if (filters.kmMax !== BOUNDS.kmMax) chips.push({ key: 'km', label: `Up to ${num(filters.kmMax)} km`, clear: (f) => ({ ...f, kmMax: BOUNDS.kmMax }) });
  for (const facet of ['history', 'transmission', 'drivetrain', 'fuel', 'source'])
    for (const o of filters[facet]) chips.push({ key: facet + o, label: o, clear: (f) => ({ ...f, [facet]: f[facet].filter((x) => x !== o) }) });
  if (!chips.length) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Active filters">
      {chips.map((c) => (
        <li key={c.key}>
          <button
            type="button"
            onClick={() => setFilters(c.clear)}
            className="num inline-flex h-8 items-center gap-1.5 rounded-full border border-control bg-surface pr-2 pl-3 text-[13px] text-ink hover:border-[#aeb4bb]"
            aria-label={`Remove filter ${c.label}`}
          >
            {c.label}
            <X size={13} strokeWidth={2} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function FilterSheet({ open, onClose, children, resultCount }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" key="sheet">
          <motion.div className="absolute inset-0 bg-[rgba(10,12,16,0.32)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[14px] bg-surface shadow-[0_-12px_32px_rgba(16,24,40,0.14)]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%', transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            transition={{ duration: 0.42, ease: EASE }}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-control" aria-hidden="true" />
            <div className="flex-1 overflow-y-auto px-2 pt-3 pb-4">{children}</div>
            <div className="border-t border-line p-3">
              <Button variant="primary" className="h-11 w-full" onClick={onClose}>
                Show {resultCount} {resultCount === 1 ? 'car' : 'cars'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function Inventory() {
  const { vehicles } = useStore();
  const [filters, setFiltersState] = useState(sessionFilters);
  const [sort, setSortState] = useState(sessionSort);
  const [sheetOpen, setSheetOpen] = useState(false);
  const setFilters = (u) =>
    setFiltersState((f) => {
      const next = typeof u === 'function' ? u(f) : u;
      sessionFilters = next;
      return next;
    });
  const setSort = (s) => {
    sessionSort = s;
    setSortState(s);
  };
  const reset = () => setFilters({ ...EMPTY_FILTERS, query: filters.query });

  const results = useMemo(() => sortList(vehicles.filter((v) => matches(v, filters)), sort, filters.query), [vehicles, filters, sort]);
  const deals = results.filter((v) => priceRating(v).key === 'great').length;
  const active = activeFilterCount(filters);

  // Only the cards on screen at first load perform an entrance; filtering is too frequent to animate.
  const firstIds = useRef(null);
  if (firstIds.current === null) firstIds.current = new Set(results.map((v) => v.id));

  const panel = <FilterPanel filters={filters} setFilters={setFilters} list={vehicles} onReset={reset} />;

  return (
    <Shell title="Inventory" sidebar={panel}>
      <div className="mx-auto max-w-[1200px]">
        <Reveal hero className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl leading-8 font-bold tracking-[-0.02em]">Inventory</h1>
            <p className="num mt-1 text-sm text-muted">
              {results.length} of {vehicles.length} {meta.mode === 'live' ? 'live listings' : 'sample listings'} match
              {deals > 0 && (
                <>
                  {' · '}
                  <span className="text-ink">
                    {deals} priced 5% or more under similar listings
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
            <label className="relative w-full sm:w-[300px]">
              <span className="sr-only">Search make, model, trim or feature</span>
              <Search size={15} strokeWidth={1.8} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                type="search"
                value={filters.query}
                onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                placeholder="Make, model, trim or feature"
                className="h-9 w-full rounded-[var(--radius-control)] border border-control bg-surface pr-3 pl-9 text-sm text-ink placeholder:text-[#6b6f75] hover:border-[#aeb4bb]"
              />
            </label>
            <Button className="lg:hidden" onClick={() => setSheetOpen(true)} aria-label={`Filters, ${active} active`}>
              <SlidersHorizontal size={15} strokeWidth={1.8} aria-hidden="true" />
              Filters{active > 0 && <span className="num text-muted">{active}</span>}
            </Button>
            <label className="flex-1 sm:flex-none">
              <span className="sr-only">Sort by</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-9 w-full rounded-[var(--radius-control)] border border-control bg-surface px-2.5 text-sm text-ink hover:border-[#aeb4bb] sm:w-auto"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Reveal>

        <Reveal hero delay={0.1} className="mt-6">
          <BodyCounts filters={filters} setFilters={setFilters} list={vehicles} />
        </Reveal>

        {active > 0 && (
          <div className="mt-4">
            <ActiveChips filters={filters} setFilters={setFilters} />
          </div>
        )}

        {results.length === 0 ? (
          <div className="mt-6 rounded-[var(--radius-card)] border border-dashed border-control bg-surface px-5 py-8">
            <p className="text-sm text-ink">No cars match these filters{filters.query ? ` and “${filters.query}”` : ''}.</p>
            <p className="mt-1 text-sm text-muted">Widen the price or kilometre range, or clear a filter to see more of the {vehicles.length} listings.</p>
            <div className="mt-4 flex gap-2">
              <Button variant="primary" onClick={() => setFilters(EMPTY_FILTERS)}>
                Clear search and filters
              </Button>
            </div>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Vehicles">
            {results.map((v) => (
              <li key={v.id} className="min-w-0">
                {firstIds.current.has(v.id) ? (
                  <Reveal className="h-full">
                    <VehicleCard v={v} />
                  </Reveal>
                ) : (
                  <VehicleCard v={v} />
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 max-w-[70ch] text-xs leading-5 text-muted">
          {meta.mode === 'live' ? (
            <>
              Live dealer listings in {meta.cities.join(', ')}, via {meta.provider}, refreshed {refreshed} (Toronto time). Listings can sell between refreshes; confirm with
              the dealer. Price ratings compare each car with used listings of the same model and year across Canada. Photos belong to each dealer.
            </>
          ) : (
            <>
              Sample inventory for demonstration. Price ratings compare each car with similar listings (same model, within two model years and 25,000 km). Photos: Wikimedia
              Commons contributors, credited on each listing.
            </>
          )}{' '}
          Bi-weekly estimates include sales tax for your chosen province and exclude licensing and dealer fees.
        </p>
      </div>

      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} resultCount={results.length}>
        {panel}
      </FilterSheet>
    </Shell>
  );
}
