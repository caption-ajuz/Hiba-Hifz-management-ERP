import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { attachGlobalPWAInstallListeners } from './hooks/usePWAInstall';
import { initPwaRuntime } from './services/offlineSync';

// Capture beforeinstallprompt early & boot Workbox SW + Background/Periodic Sync
attachGlobalPWAInstallListeners();
initPwaRuntime();

createRoot(document.getElementById('root')!).render(<App />);
