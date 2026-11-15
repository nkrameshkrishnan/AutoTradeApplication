import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Heart, X } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { asset, km, money, place, title, cover } from '../lib/format.js';
import { RatingBadge } from './ui.jsx';
import { CompareCheck } from './VehicleCard.jsx';
import { EASE } from './motion.jsx';

export default function SavedDrawer() {
  const { saved, byId, savedOpen, setSavedOpen, toggleSaved } = useStore();
  const closeRef = useRef(null);
  const lastFocus = useRef(null);
  const cars = saved.map(byId).filter(Boolean);
  const total = cars.reduce((s, c) => s + c.price, 0);

  useEffect(() => {
    if (!savedOpen) return;
    lastFocus.current = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && setSavedOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      lastFocus.current?.focus?.();
    };
  }, [savedOpen, setSavedOpen]);

  return (
    <AnimatePresence>
      {savedOpen && (
        <div className="fixed inset-0 z-50" key="saved">
          <motion.div
            className="absolute inset-0 bg-[rgba(10,12,16,0.32)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3 }}
            onClick={() => setSavedOpen(false)}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="saved-title"
            className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col bg-surface shadow-[-12px_0_32px_rgba(16,24,40,0.14)]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%', transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            transition={{ duration: 0.42, ease: EASE }}
          >
            <header className="flex h-16 flex-none items-center justify-between border-b border-line px-5">
              <div>
                <h2 id="saved-title" className="text-base font-medium">
                  Saved cars
                </h2>
                <p className="num text-xs text-muted">{cars.length === 0 ? 'Nothing saved yet' : `${cars.length} saved · ${money(total)} combined`}</p>
              </div>
              <button ref={closeRef} type="button" onClick={() => setSavedOpen(false)} className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-[6px] hover:bg-raised" aria-label="Close saved cars">
                <X size={18} strokeWidth={1.6} />
              </button>
            </header>

            {cars.length === 0 ? (
              <div className="m-5 rounded-[8px] border border-dashed border-control p-5 text-sm">
                <p className="text-ink">Tap the heart on any listing to keep it here.</p>
                <p className="mt-1 text-muted">Saved cars stay on this device, even after you close the tab.</p>
                <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line">
                    <Heart size={13} strokeWidth={1.8} />
                  </span>
                  The heart sits on each car&rsquo;s photo.
                </div>
              </div>
            ) : (
              <ul className="flex-1 overflow-y-auto px-5">
                <AnimatePresence initial={false}>
                  {cars.map((v) => (
                    <motion.li
                      key={v.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                      className="border-b border-rule py-4 last:border-0"
                    >
                      <div className="flex gap-3">
                        <Link to={`/vehicle/${v.id}`} onClick={() => setSavedOpen(false)} className="flex-none">
                          <img src={asset(cover(v))} alt="" className="h-[60px] w-[88px] rounded-[6px] object-cover" />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <Link to={`/vehicle/${v.id}`} onClick={() => setSavedOpen(false)} className="min-w-0 text-sm font-medium text-ink no-underline hover:underline">
                              <span className="block truncate">{title(v)}</span>
                              <span className="block truncate text-xs font-normal text-muted">{v.trim}</span>
                            </Link>
                            <p className="num flex-none text-sm font-bold">{money(v.price)}</p>
                          </div>
                          <p className="num mt-1 truncate text-xs text-muted">
                            {km(v.odometer)} · {place(v)}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <RatingBadge vehicle={v} />
                            <div className="flex items-center gap-3">
                              <CompareCheck id={v.id} name={title(v)} compact />
                              <button type="button" onClick={() => toggleSaved(v.id)} className="text-xs text-ink underline hover:no-underline">
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
