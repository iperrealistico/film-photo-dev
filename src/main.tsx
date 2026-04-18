import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { initializeDebugLifecycleLogging, logDebugEvent } from './debug/logging';
import { runSelfCheck } from './debug/selfCheck';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import './styles/global.css';

initializeDebugLifecycleLogging();
logDebugEvent({
  category: 'app',
  event: 'main_boot'
});
runSelfCheck();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
