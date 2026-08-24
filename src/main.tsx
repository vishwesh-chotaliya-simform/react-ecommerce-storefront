import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { installSessionIntegration } from '@/features/auth/session-integration';

import { App } from './App';
import './styles/index.css';

// Wire the API client to the session before anything can fire a request.
installSessionIntegration();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
