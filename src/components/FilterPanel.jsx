import { useId } from 'react';
import { BOUNDS, DRIVETRAINS, FUELS, HISTORY, SOURCES, TRANSMISSIONS, activeFilterCount, facetCounts } from '../lib/filters.js';
import { money, num } from '../lib/format.js';

function Group({ label, children, aside }) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <div className="mb-2 flex items-baseline justify-between px-2.5">
        <legend className="p-0 text-xs text-muted">{label}</legend>
        {aside && <span className="num text-xs text-ink">{aside}</span>}
      </div>
      {children}
    </fieldset>
  );
}

function Checks({ facet, options, filters, setFilters, list }) {
  const counts = facetCounts(list, filters, facet, options);
  const selected = filters[facet];
  return (
    <div className="flex flex-col">
      {options.map((o) => {
        const on = selected.includes(o);
        const zero = counts[o] === 0 && !on;
        return (
          <label key={o} className={`flex h-8 cursor-pointer items-center gap-2.5 rounded-[6px] px-2.5 text-sm hover:bg-raised ${zero ? 'text-muted' : 'text-ink'}`}>
            <input
              type="checkbox"
              className="h-4 w-4 flex-none"
              checked={on}
              onChange={() => setFilters((f) => ({ ...f, [facet]: on ? f[facet].filter((x) => x !== o) : [...f[facet], o] }))}
            />
            <span className="flex-1">{o}</span>
            <span className="num text-xs text-muted">{counts[o]}</span>
          </label>
        );
      })}
    </div>
  );
}

function DualRange({ min, max, step, low, high, onChange, label, format }) {
  const id = useId();
  const pct = (n) => ((n - min) / (max - min)) * 100;
  return (
    <div className="px-2.5">
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-control" />
        <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-ink" style={{ left: `${pct(low)}%`, right: `${100 - pct(high)}%` }} />
        <input
          id={`${id}-lo`}
          aria-label={`${label} minimum`}
          aria-valuetext={format(low)}
          type="range"
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={(e) => onChange(Math.min(Number(e.target.value), high - step), high)}
          className="dual absolute inset-0"
        />
        <input
          id={`${id}-hi`}
          aria-label={`${label} maximum`}
          aria-valuetext={format(high)}
          type="range"
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={(e) => onChange(low, Math.max(Number(e.target.value), low + step))}
          className="dual absolute inset-0"
        />
      </div>
    </div>
  );
}

const selectCls =
  'h-9 w-full rounded-[var(--radius-control)] border border-control bg-surface px-2.5 text-sm text-ink num hover:border-[#aeb4bb]';

export default function FilterPanel({ filters, setFilters, list, onReset }) {
  const active = activeFilterCount(filters);
  const years = [];
  for (let y = BOUNDS.yearMin; y <= BOUNDS.yearMax; y++) years.push(y);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex h-6 items-center justify-between px-2.5">
        <h2 className="text-sm font-medium text-ink">Filters</h2>
        {active > 0 && (
          <button type="button" onClick={onReset} className="text-xs text-ink underline hover:no-underline">
            Reset {active}
          </button>
        )}
      </div>

      <Group label="Price" aside={`${money(filters.priceMin)} – ${money(filters.priceMax)}`}>
        <DualRange
          label="Price"
          min={BOUNDS.priceMin}
          max={BOUNDS.priceMax}
          step={500}
          low={filters.priceMin}
          high={filters.priceMax}
          format={money}
          onChange={(lo, hi) => setFilters((f) => ({ ...f, priceMin: lo, priceMax: hi }))}
        />
      </Group>

      <Group label="Year">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-2.5">
          <select aria-label="Year from" className={selectCls} value={filters.yearMin} onChange={(e) => setFilters((f) => ({ ...f, yearMin: Math.min(Number(e.target.value), f.yearMax) }))}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span className="text-xs text-muted">to</span>
          <select aria-label="Year to" className={selectCls} value={filters.yearMax} onChange={(e) => setFilters((f) => ({ ...f, yearMax: Math.max(Number(e.target.value), f.yearMin) }))}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </Group>

      <Group label="Kilometres" aside={filters.kmMax >= BOUNDS.kmMax ? 'Any' : `Up to ${num(filters.kmMax)} km`}>
        <div className="px-2.5">
          <input
            type="range"
            aria-label="Maximum kilometres"
            aria-valuetext={filters.kmMax >= BOUNDS.kmMax ? 'Any' : `${num(filters.kmMax)} km`}
            min={10000}
            max={BOUNDS.kmMax}
            step={5000}
            value={filters.kmMax}
            onChange={(e) => setFilters((f) => ({ ...f, kmMax: Number(e.target.value) }))}
          />
        </div>
      </Group>

      <Group label="Vehicle history">
        <Checks facet="history" options={HISTORY} filters={filters} setFilters={setFilters} list={list} />
      </Group>

      <Group label="Transmission">
        <Checks facet="transmission" options={TRANSMISSIONS} filters={filters} setFilters={setFilters} list={list} />
      </Group>
      <Group label="Drivetrain">
        <Checks facet="drivetrain" options={DRIVETRAINS} filters={filters} setFilters={setFilters} list={list} />
      </Group>
      <Group label="Fuel type">
        <Checks facet="fuel" options={FUELS} filters={filters} setFilters={setFilters} list={list} />
      </Group>
      <Group label="Listed on">
        <Checks facet="source" options={SOURCES} filters={filters} setFilters={setFilters} list={list} />
      </Group>
    </div>
  );
}
