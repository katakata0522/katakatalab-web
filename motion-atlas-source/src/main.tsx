import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root mount container (#root) not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary variant="page">
      <App />
    </ErrorBoundary>
  </StrictMode>
);
