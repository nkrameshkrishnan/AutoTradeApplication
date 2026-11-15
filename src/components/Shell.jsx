import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CarFront, Columns3, Heart, Menu, X } from 'lucide-react';
import { Mark } from './ui.jsx';
import { EASE } from './motion.jsx';
import { useStore } from '../lib/store.jsx';
import { provinceByCode } from '../lib/finance.js';

function NavItems({ onNavigate }) {
  const { compare, saved, setSavedOpen } = useStore();
  const row = 'flex h-8 items-center gap-2.5 rounded-[6px] px-2.5 text-sm transition-colors';
  const cls = ({ isActive }) => `${row} ${isActive ? 'bg-active text-ink' : 'text-muted hover:bg-raised hover:text-ink'}`;
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      <NavLink to="/" end className={cls} onClick={onNavigate}>
        <CarFront size={16} strokeWidth={1.6} aria-hidden="true" />
        <span className="flex-1">Inventory</span>
      </NavLink>
      <NavLink to="/compare" className={cls} onClick={onNavigate}>
        <Columns3 size={16} strokeWidth={1.6} aria-hidden="true" />
        <span className="flex-1">Compare</span>
        {compare.length > 0 && <span className="num text-xs text-muted">{compare.length} of 4</span>}
      </NavLink>
      <button
        type="button"
        className={`${row} text-left text-muted hover:bg-raised hover:text-ink`}
        onClick={() => {
          onNavigate?.();
          setSavedOpen(true);
        }}
      >
        <Heart size={16} strokeWidth={1.6} aria-hidden="true" />
        <span className="flex-1">Saved cars</span>
        {saved.length > 0 && <span className="num text-xs text-muted">{saved.length}</span>}
      </button>
    </nav>
  );
}

function Brand() {
  return (
    <NavLink to="/" className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-1 text-ink no-underline">
      <Mark />
      <span className="leading-tight">
        <span className="block text-[15px] font-medium tracking-[-0.01em]">Kilometre</span>
        <span className="block text-xs text-muted">Used cars across Canada</span>
      </span>
    </NavLink>
  );
}

function FinanceStamp() {
  const { finance } = useStore();
  const p = provinceByCode(finance.province);
  return (
    <p className="px-2.5 text-xs leading-5 text-muted">
      Payments estimated at <span className="num text-ink">{finance.apr.toFixed(2)}%</span> over{' '}
      <span className="num text-ink">{finance.term} months</span>, taxed for {p.name}. Change them in any car&rsquo;s calculator.
    </p>
  );
}

export default function Shell({ sidebar, title, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => (document.body.style.overflow = '');
  }, [menuOpen]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      {/* Desktop sidebar: on the page ground, one hairline to the canvas. */}
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-line px-3 pt-6 pb-5 lg:flex">
        <Brand />
        <div className="mt-6">
          <NavItems />
        </div>
        {sidebar && <div className="mt-8 flex-1">{sidebar}</div>}
        {!sidebar && <div className="flex-1" />}
        <div className="mt-8 border-t border-line pt-4">
          <FinanceStamp />
        </div>
      </aside>

      {/* Phone and tablet: a 48px bar with the screen's name and a menu. */}
      <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-line bg-ground px-4 lg:hidden">
        <NavLink to="/" aria-label="Kilometre home" className="text-ink">
          <Mark />
        </NavLink>
        <span className="flex-1 truncate text-[15px] font-medium">{title}</span>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-[6px] text-ink hover:bg-raised"
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          <Menu size={20} strokeWidth={1.6} />
        </button>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-50 flex flex-col bg-ground px-4 pt-2 pb-6 lg:hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <div className="flex h-10 items-center justify-between">
              <Brand />
              <button type="button" onClick={() => setMenuOpen(false)} className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-[6px] hover:bg-raised" aria-label="Close menu">
                <X size={20} strokeWidth={1.6} />
              </button>
            </div>
            <div className="mt-6 [&_a]:h-11 [&_button]:h-11 [&_a]:text-base [&_button]:text-base">
              <NavItems onNavigate={() => setMenuOpen(false)} />
            </div>
            <div className="mt-auto border-t border-line pt-4">
              <FinanceStamp />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="main" className="min-w-0 px-4 pt-5 pb-[calc(var(--tray-h)+48px)] sm:px-6 lg:px-8 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
