import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/index.css';

console.log('API KEY:', import.meta.env.VITE_FINNHUB_API_KEY);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,

);
