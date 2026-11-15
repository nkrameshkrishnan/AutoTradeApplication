import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { useStore, MAX_COMPARE } from '../lib/store.jsx';
import { calculateFinance } from '../lib/finance.js';
import { asset, km, money, place, title } from '../lib/format.js';
import { PricePosition, RatingBadge } from './ui.jsx';
import { EASE } from './motion.jsx';

export function SaveButton({ id, name, className = '' }) {
  const { saved, toggleSaved } = useStore();
  const on = saved.includes(id);
  return (
    <motion.button
      type="button"
      onClick={() => toggleSaved(id)}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from saved cars` : `Save ${name}`}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink ${className}`}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      <motion.span
        key={on ? 'on' : 'off'}
        initial={{ scale: on ? 0.6 : 1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="inline-flex"
      >
        <Heart size={16} strokeWidth={1.8} fill={on ? 'currentColor' : 'none'} aria-hidden="true" />
      </motion.span>
    </motion.button>
  );
}

export function CompareCheck({ id, name, compact = false }) {
  const { compare, toggleCompare } = useStore();
  const on = compare.includes(id);
  const full = !on && compare.length >= MAX_COMPARE;
  return (
    <label
      className={`inline-flex min-h-9 items-center gap-2 text-sm ${full ? 'cursor-not-allowed text-muted' : 'cursor-pointer text-ink'}`}
      title={full ? 'You can compare up to 4 cars. Remove one from the tray first.' : undefined}
    >
      <input type="checkbox" className="h-4 w-4" checked={on} disabled={full} onChange={() => toggleCompare(id)} aria-label={`Compare ${name}`} />
      <span aria-hidden="true">{compact ? 'Compare' : full ? 'Compare (4 max)' : 'Compare'}</span>
    </label>
  );
}

export default function VehicleCard({ v }) {
  const { finance } = useStore();
  const pay = calculateFinance(v.price, finance);
  const name = `${title(v)} ${v.trim}`;
  const img = v.images[0];
  return (
    <motion.article
      className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface transition-colors hover:border-[#cdd2d8]"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-raised">
        <img
          src={asset(img.src)}
          alt={img.alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
        />
        <SaveButton id={v.id} name={name} className="absolute top-3 right-3 z-10" />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-[15px] leading-5 font-medium">
            {/* Stretched link: the whole card opens the listing, controls stay separate. */}
            <Link to={`/vehicle/${v.id}`} className="text-ink no-underline after:absolute after:inset-0 after:content-['']">
              {title(v)}
            </Link>
            <span className="mt-0.5 block truncate text-[13px] font-normal text-muted">{v.trim}</span>
          </h3>
          <RatingBadge vehicle={v} />
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="num text-xl leading-6 font-bold">{money(v.price)}</p>
          <p className="num text-right text-xs text-muted">
            <span className="text-ink">{money(pay.biweekly)}</span> bi-weekly est.
          </p>
        </div>
        <p className="num mt-1 text-[13px] text-muted">
          {km(v.odometer)} · {place(v)}
        </p>

        <div className="mt-4 mb-4">
          <PricePosition vehicle={v} />
        </div>

        <div className="relative z-10 mt-auto flex items-center justify-between border-t border-rule pt-3">
          <CompareCheck id={v.id} name={name} />
          <span className="text-xs text-muted">on {v.source}</span>
        </div>
      </div>
    </motion.article>
  );
}
