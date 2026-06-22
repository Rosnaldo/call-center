import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { bootstrap } from './bootstrap.ts';
import { StoreProvider } from './states/StoreProvider.tsx';
import { createStores } from './states/stores.ts';
import { DailyService } from './services/daily.ts';

const dailyService = DailyService.getInstance({
    domain: (import.meta.env.VITE_DAILY_DOMAIN as string) ?? 'meetcent',
    apiKey: (import.meta.env.VITE_DAILY_API_KEY as string) ?? '',
});
const stores = createStores(dailyService);

if ((import.meta as any).env?.VITE_ENV !== 'simulation') {
    bootstrap(stores, dailyService);
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <StoreProvider stores={stores}>
            <BrowserRouter>
                <App dailyService={dailyService} />
            </BrowserRouter>
        </StoreProvider>
    </StrictMode>,
);
