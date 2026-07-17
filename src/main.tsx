import './stub-sync';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DataProvider } from './contexts/DataContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <App />
    </DataProvider>
  </StrictMode>,
);

const isIframe = window.self !== window.top;
const isDev = window.location.hostname === 'localhost' || 
              window.location.hostname.includes('dev') || 
              window.location.hostname.includes('pre') || 
              window.location.port === '3000';

if ('serviceWorker' in navigator && !isIframe && !isDev) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        console.log('SW registered: ', registration);
      }).catch(registrationError => {
        console.warn('SW registration failed asynchronously: ', registrationError);
      });
    } catch (e) {
      console.warn('SW registration failed synchronously: ', e);
    }
  });
} else {
  console.log('[SW] Service worker registration bypassed in iframe/development environment to prevent caching and background sync issues.');
  
  // Unregister any existing service workers in this iframe environment to avoid stale cache
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister().then(unregistered => {
          if (unregistered) {
            console.log('[SW] Unregistered existing service worker successfully.');
          }
        });
      }
    }).catch(err => {
      console.warn('[SW] Failed to clean up service workers:', err);
    });
  }
}

