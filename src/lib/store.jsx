import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import vehicles from '../data/vehicles.json';
import { DEFAULT_FINANCE } from './finance.js';

const KEYS = {
  compare: 'kilometre.compare.v1',
  saved: 'kilometre.saved.v1',
  finance: 'kilometre.finance.v1',
};

export const MAX_COMPARE = 4;

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function usePersisted(key, fallback, sanitize = (v) => v) {
  const [value, setValue] = useState(() => sanitize(read(key, fallback)));
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode or full storage: the session still works in memory */
    }
  }, [key, value]);
  return [value, setValue];
}

const ids = new Set(vehicles.map((v) => v.id));
const onlyKnown = (list) => (Array.isArray(list) ? list.filter((id) => ids.has(id)) : []);

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [compare, setCompare] = usePersisted(KEYS.compare, [], (l) => onlyKnown(l).slice(0, MAX_COMPARE));
  const [saved, setSaved] = usePersisted(KEYS.saved, [], onlyKnown);
  const [finance, setFinance] = usePersisted(KEYS.finance, DEFAULT_FINANCE, (f) => ({ ...DEFAULT_FINANCE, ...(f || {}) }));
  const [savedOpen, setSavedOpen] = useState(false);

  const toggleCompare = useCallback(
    (id) =>
      setCompare((list) => {
        if (list.includes(id)) return list.filter((x) => x !== id);
        if (list.length >= MAX_COMPARE) return list;
        return [...list, id];
      }),
    [setCompare]
  );
  const toggleSaved = useCallback(
    (id) => setSaved((list) => (list.includes(id) ? list.filter((x) => x !== id) : [id, ...list])),
    [setSaved]
  );
  const updateFinance = useCallback((patch) => setFinance((f) => ({ ...f, ...patch })), [setFinance]);

  const value = useMemo(
    () => ({
      vehicles,
      byId: (id) => vehicles.find((v) => v.id === id),
      compare,
      toggleCompare,
      clearCompare: () => setCompare([]),
      setCompareList: (list) => setCompare(onlyKnown(list).slice(0, MAX_COMPARE)),
      saved,
      toggleSaved,
      finance,
      updateFinance,
      resetFinance: () => setFinance(DEFAULT_FINANCE),
      savedOpen,
      setSavedOpen,
    }),
    [compare, saved, finance, savedOpen, toggleCompare, toggleSaved, updateFinance, setCompare, setFinance]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
