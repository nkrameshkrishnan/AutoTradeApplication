import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import App from './App.jsx';
import { StoreProvider } from './lib/store.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* HashRouter: deep links and refreshes never 404 on GitHub Pages. */}
    <HashRouter>
      {/* reducedMotion="user" drops transform travel for people who ask for less motion; opacity stays. */}
      <MotionConfig reducedMotion="user">
        <StoreProvider>
          <App />
        </StoreProvider>
      </MotionConfig>
    </HashRouter>
  </React.StrictMode>
);
