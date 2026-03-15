import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('[reqlog] #root element not found in index.html');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
