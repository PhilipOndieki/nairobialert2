
import { StrictMode } from 'react';
import { inject } from '@vercel/analytics';
if (import.meta.env.PROD) {
  inject();
}
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
