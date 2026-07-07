import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './i18n.ts';
import { bootstrap } from './bootstrap.ts';
import { StoreProvider } from './states/StoreProvider.tsx';
import { createStores } from './states/stores.ts';
import { DailyService } from './services/daily.ts';
import { DevicesProvider } from './providers/devices.tsx';
import App from './App.tsx';
import properties from './properties';
import { primeAudioPlayback } from './utils/helpers.ts';
import './index.css';

const dailyService = DailyService.getInstance({
    domain: properties.dailyDomain,
    apiKey: properties.dailyApiKey,
});
const stores = createStores(dailyService);

primeAudioPlayback();
bootstrap(stores);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <StoreProvider stores={stores}>
            <DevicesProvider>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </DevicesProvider>
        </StoreProvider>
    </StrictMode>,
);
