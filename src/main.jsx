// File: src/main.jsx
// Purpose: React application entry point with StrictMode
// Dependencies: react, react-dom, ./App, ./index.css

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
