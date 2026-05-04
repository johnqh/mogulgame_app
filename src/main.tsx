import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import { initializeApp } from './config/initialize';

initializeApp().then(async () => {
  const { default: App } = await import('./App');
  const root = document.getElementById('root')!;
  createRoot(root).render(
    <StrictMode>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </StrictMode>
  );
});
