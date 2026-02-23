import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './i18n'; // must be imported before App
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
