import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useStore, MAX_COMPARE } from '../lib/store.jsx';
import { asset, money, title } from '../lib/format.js';
import { Button } from './ui.jsx';
import { EASE } from './motion.jsx';

export default function CompareTray() {
  const { compare, byId, toggleCompare, clearCompare } = useStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const ref = useRef(null);
  const show = compare.length > 0 && pathname !== '/compare';

  // Reserve room under the page so the tray never covers the last row.
  useEffect(() => {
    const root = document.documentElement;
    if (!show || !ref.current) {
      root.style.setProperty('--tray-h', '0px');
      return;
    }
    const ro = new ResizeObserver(([e]) => root.style.setProperty('--tray-h', `${Math.ceil(e.contentRect.height) + 24}px`));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [show]);

  const cars = compare.map(byId).filter(Boolean);
  const slots = Array.from({ length: MAX_COMPARE }, (_, i) => cars[i]);
  const ready = cars.length >= 2;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="tray"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-3 lg:left-[256px] lg:px-8 lg:pb-5"
          initial={{ y: '110%' }}
          animate={{ y: 0 }}
          exit={{ y: '110%', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <section
            ref={ref}
            aria-label="Compare tray"
            className="pointer-events-auto mx-auto flex max-w-[1080px] flex-wrap items-center gap-x-4 gap-y-3 rounded-[10px] border border-line bg-surface p-3 shadow-[0_8px_28px_rgba(16,24,40,0.12)] sm:flex-nowrap sm:pl-4"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {slots.map((v, i) =>
                v ? (
                  <motion.div key={v.id} layout className="group relative flex-none" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: EASE }}>
                    <img src={asset(v.images[0].src)} alt="" className="h-11 w-16 rounded-[5px] object-cover sm:h-12 sm:w-[72px]" />
                    <button
                      type="button"
                      onClick={() => toggleCompare(v.id)}
                      aria-label={`Remove ${title(v)} from compare`}
                      className="absolute -top-1.5 -right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-ink hover:bg-raised"
                    >
                      <X size={12} strokeWidth={2} />
                    </button>
                  </motion.div>
                ) : (
                  <div key={`empty-${i}`} className="hidden h-12 w-[72px] flex-none rounded-[5px] border border-dashed border-control sm:block" aria-hidden="true" />
                )
              )}
              <div className="ml-2 min-w-0 text-sm leading-5">
                <p className="num font-medium text-ink">
                  {cars.length} of {MAX_COMPARE} selected
                </p>
                <p className="truncate text-xs text-muted">
                  {ready ? `${money(Math.min(...cars.map((c) => c.price)))} to ${money(Math.max(...cars.map((c) => c.price)))}` : 'Pick one more car to compare'}
                </p>
              </div>
            </div>
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              <Button variant="ghost" onClick={clearCompare}>
                Clear all
              </Button>
              <Button variant="primary" disabled={!ready} onClick={() => navigate('/compare')}>
                Compare now
              </Button>
            </div>
          </section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
