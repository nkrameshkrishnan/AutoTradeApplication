import { useEffect, useId, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { PROVINCES, TERMS, calculateFinance } from '../lib/finance.js';
import { money, money2 } from '../lib/format.js';
import { Card, Segmented } from './ui.jsx';

function Field({ label, htmlFor, aside, children }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        {aside && <span className="text-xs text-muted">{aside}</span>}
      </div>
      {children}
    </div>
  );
}

function NumberWithRange({ id, value, onChange, min, max, step, prefix, suffix, decimals = 0, label }) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    if (Number(text) !== value) setText(decimals ? value.toFixed(decimals) : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const commit = (raw) => {
    const n = Number(String(raw).replace(/[^0-9.]/g, ''));
    if (Number.isFinite(n)) onChange(Math.min(Math.max(n, min), max));
  };
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3">
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted">{prefix}</span>}
        <input
          id={id}
          inputMode="decimal"
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => setText(decimals ? value.toFixed(decimals) : String(value))}
          className={`num h-9 w-full rounded-[var(--radius-control)] border border-control bg-surface text-right text-sm text-ink hover:border-[#aeb4bb] ${prefix ? 'pl-6' : 'pl-2.5'} ${suffix ? 'pr-7' : 'pr-2.5'}`}
        />
        {suffix && <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted">{suffix}</span>}
      </div>
      <input type="range" aria-label={`${label} slider`} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export default function FinanceCalculator({ vehicle }) {
  const { finance, updateFinance, resetFinance } = useStore();
  const id = useId();
  const r = calculateFinance(vehicle.price, finance);
  const maxDown = Math.round((r.taxable + r.tax) / 500) * 500;

  return (
    <Card aria-labelledby={`${id}-h`} className="p-5">
      <div className="flex items-center justify-between">
        <h2 id={`${id}-h`} className="text-base font-medium">
          Financing
        </h2>
        <button type="button" onClick={resetFinance} className="inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-xs text-muted hover:bg-raised hover:text-ink">
          <RotateCcw size={13} strokeWidth={1.8} aria-hidden="true" />
          Reset
        </button>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4" aria-live="polite">
        <div>
          <p className="text-xs text-muted">Bi-weekly</p>
          <p className="num text-[30px] leading-9 font-bold tracking-[-0.02em]">{money2(r.biweekly)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Monthly</p>
          <p className="num text-base font-bold">{money2(r.monthly)}</p>
        </div>
      </div>
      <p className="num mt-1 text-xs text-muted">
        {r.biweeklyPeriods} payments over {finance.term} months at {finance.apr.toFixed(2)}% APR
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <Field label="Province" htmlFor={`${id}-prov`} aside={r.prov.label}>
          <select
            id={`${id}-prov`}
            value={finance.province}
            onChange={(e) => updateFinance({ province: e.target.value })}
            className="h-9 w-full rounded-[var(--radius-control)] border border-control bg-surface px-2.5 text-sm text-ink hover:border-[#aeb4bb]"
          >
            {PROVINCES.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Down payment" htmlFor={`${id}-down`}>
          <NumberWithRange id={`${id}-down`} label="Down payment" prefix="$" value={finance.downPayment} min={0} max={maxDown} step={500} onChange={(n) => updateFinance({ downPayment: n })} />
        </Field>

        <Field label="Trade-in value" htmlFor={`${id}-trade`} aside="Deducted before tax">
          <NumberWithRange id={`${id}-trade`} label="Trade-in value" prefix="$" value={finance.tradeIn} min={0} max={Math.min(40000, vehicle.price)} step={500} onChange={(n) => updateFinance({ tradeIn: n })} />
        </Field>

        <Field label="Loan term">
          <Segmented label="Loan term in months" options={TERMS} value={finance.term} onChange={(t) => updateFinance({ term: t })} format={(t) => `${t}`} />
          <p className="mt-1.5 text-xs text-muted">Months</p>
        </Field>

        <Field label="Interest rate" htmlFor={`${id}-apr`} aside="APR">
          <NumberWithRange id={`${id}-apr`} label="Interest rate" suffix="%" decimals={2} value={finance.apr} min={0} max={15} step={0.05} onChange={(n) => updateFinance({ apr: Math.round(n * 100) / 100 })} />
        </Field>
      </div>

      <dl className="num mt-6 border-t border-rule pt-4 text-sm">
        {[
          ['Vehicle price', money2(vehicle.price)],
          ['Trade-in credit', r.tradeCredit ? `−${money2(r.tradeCredit)}` : money2(0)],
          [r.prov.label, money2(r.tax)],
          ['Down payment', r.down ? `−${money2(r.down)}` : money2(0)],
        ].map(([k, v]) => (
          <div key={k} className="flex h-7 items-center justify-between">
            <dt className="text-muted">{k}</dt>
            <dd className="text-ink">{v}</dd>
          </div>
        ))}
        <div className="mt-1 flex h-8 items-center justify-between border-t border-rule">
          <dt className="font-medium text-ink">Amount financed</dt>
          <dd className="font-bold">{money2(r.financed)}</dd>
        </div>
        <div className="flex h-7 items-center justify-between">
          <dt className="text-muted">Interest over the term</dt>
          <dd className="text-ink">{money2(r.interest)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-5 text-muted">
        Estimate only; excludes licensing, registration and dealer fees. Your settings are kept on this device and used for every car&rsquo;s bi-weekly estimate.
      </p>
      <p className="sr-only">Total paid over the term {money(r.totalPaid)}.</p>
    </Card>
  );
}
