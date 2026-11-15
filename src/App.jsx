import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Inventory from './views/Inventory.jsx';
import Compare from './views/Compare.jsx';
import VehicleDetail from './views/VehicleDetail.jsx';
import CompareTray from './components/CompareTray.jsx';
import SavedDrawer from './components/SavedDrawer.jsx';
import Shell from './components/Shell.jsx';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <Shell title="Page not found">
      <div className="mx-auto max-w-[1200px]">
        <h1 className="text-2xl leading-8 font-medium">Page not found</h1>
        <p className="mt-1 text-sm text-muted">That link doesn&rsquo;t match a page in Kilometre.</p>
        <Link to="/" className="mt-4 inline-flex h-9 items-center rounded-[6px] bg-primary px-3.5 text-sm font-medium text-white no-underline">
          Browse inventory
        </Link>
      </div>
    </Shell>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname !== '/') window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Inventory />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/vehicle/:id" element={<VehicleDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <CompareTray />
      <SavedDrawer />
    </>
  );
}
