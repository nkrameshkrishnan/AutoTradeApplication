import { useId } from 'react';
import { motion } from 'motion/react';
import { EASE, PressButton } from './motion.jsx';
import { money, signedMoney } from '../lib/format.js';
import { priceRating } from '../lib/finance.js';

/* The mark: an odometer arc with its needle, drawn from the product's own object. */
export function Mark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M5 22a11 11 0 0 1 22 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 22 23 13.5" stroke="var(--color-data)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="16" cy="22" r="2.8" fill="currentColor" />
    </svg>
  );
}

const pillTone = {
  great: 'bg-pos-bg text-pos-ink',
  fair: 'bg-neu-bg text-neu-ink',
  above: 'bg-warn-bg text-warn-ink',
};

export function RatingBadge({ vehicle, className = '' }) {
  const r = priceRating(vehicle);
  if (r.key === 'none') return null;
  return (
    <span className={`inline-flex h-6 flex-none items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium ${pillTone[r.key]} ${className}`}>
      {r.label}
    </span>
  );
}

/**
 * Signature element: where this price sits among similar listings.
 * A grey track from the lowest to the highest similar price, a tick at the average,
 * and this car as a dot in the one data hue.
 */
export function PricePosition({ vehicle, detailed = false }) {
  const { price, marketLow, marketHigh, marketAvg } = vehicle;
  if (!marketAvg || !marketLow || !marketHigh || marketHigh <= marketLow)
    return <p className="text-xs text-muted">Not enough comparable listings to rate this price.</p>;
  const span = marketHigh - marketLow;
  const at = (n) => Math.min(Math.max(((n - marketLow) / span) * 100, 0), 100);
  const r = priceRating(vehicle);
  const words =
    r.diff < 0
      ? `${money(Math.abs(r.diff))} under the average of similar listings`
      : r.diff > 0
        ? `${money(r.diff)} over the average of similar listings`
        : 'At the average of similar listings';
  return (
    <figure className="m-0" aria-label={`${money(price)}, ${words}. Similar listings range from ${money(marketLow)} to ${money(marketHigh)}.`}>
      {detailed && <figcaption className="mb-3 text-sm text-ink">{words}</figcaption>}
      <div className="relative h-4" aria-hidden="true">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-raised" />
        <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-control" style={{ left: `${at(marketLow)}%`, width: `${at(marketAvg)}%` }} />
        <div className="absolute top-0 h-4 w-px bg-muted" style={{ left: `${at(marketAvg)}%` }} />
        <motion.div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-data"
          style={{ left: `${at(price)}%` }}
          initial={false}
        />
      </div>
      {detailed ? (
        <div className="num mt-2 grid grid-cols-3 text-xs text-muted">
          <span>Low {money(marketLow)}</span>
          <span className="text-center">Average {money(marketAvg)}</span>
          <span className="text-right">High {money(marketHigh)}</span>
        </div>
      ) : (
        <p className="num mt-1.5 text-xs text-muted">
          {signedMoney(r.diff)} vs average {money(marketAvg)}
        </p>
      )}
    </figure>
  );
}

export function Switch({ checked, onChange, label, description }) {
  const id = useId();
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer select-none items-center gap-3">
      <span className="relative inline-flex h-5 w-[34px] flex-none">
        <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="absolute inset-0 rounded-full bg-control transition-colors duration-200 peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-data" />
        <motion.span
          className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white"
          animate={{ x: checked ? 14 : 0 }}
          transition={{ duration: 0.2, ease: EASE }}
        />
      </span>
      <span className="text-sm">
        <span className="font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function Segmented({ options, value, onChange, label, format = (o) => o }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[var(--radius-control)] bg-raised p-0.5">
      {options.map((o) => {
        const on = o === value;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o)}
            className={`num relative h-8 min-w-11 rounded-[5px] px-2.5 text-sm transition-colors ${on ? 'text-ink' : 'text-muted hover:text-ink'}`}
          >
            {on && <motion.span layoutId={`seg-${label}`} className="absolute inset-0 rounded-[5px] border border-line bg-surface" transition={{ duration: 0.25, ease: EASE }} />}
            <span className="relative">{format(o)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Button({ variant = 'secondary', className = '', children, ...rest }) {
  const base = 'inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-control)] px-3.5 text-sm font-medium whitespace-nowrap disabled:cursor-not-allowed';
  const tone = {
    primary: 'bg-primary text-white hover:bg-[#2a2a2a] disabled:bg-[#9a9ea4]',
    secondary: 'border border-control bg-surface text-ink hover:border-[#aeb4bb]',
    ghost: 'text-ink hover:bg-raised',
  }[variant];
  return (
    <PressButton className={`${base} ${tone} ${className}`} {...rest}>
      {children}
    </PressButton>
  );
}

export function Card({ as: As = 'section', className = '', children, ...rest }) {
  return (
    <As className={`rounded-[var(--radius-card)] border border-line bg-surface ${className}`} {...rest}>
      {children}
    </As>
  );
}
