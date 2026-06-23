import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { bootstrap } from './bootstrap.ts';
import { StoreProvider } from './states/StoreProvider.tsx';
import { createStores } from './states/stores.ts';
import { DailyService } from './services/daily.ts';
import { DevicesProvider } from './providers/devices.tsx';
import App from './App.tsx';
import './index.css';

const dailyService = DailyService.getInstance({
    domain: (import.meta.env.VITE_DAILY_DOMAIN as string) ?? 'meetcent',
    apiKey: (import.meta.env.VITE_DAILY_API_KEY as string) ?? '',
});
const stores = createStores(dailyService);

if ((import.meta as any).env?.VITE_ENV !== 'simulation') {
    bootstrap(stores);
}

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
