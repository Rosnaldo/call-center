import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { bootstrap } from './bootstrap.ts';
import { StoreProvider } from './states/StoreProvider.tsx';
import { createStores } from './states/stores.ts';

const stores = createStores();

if ((import.meta as any).env?.VITE_ENV !== 'simulation') {
    bootstrap(stores);
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <StoreProvider stores={stores}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </StoreProvider>
    </StrictMode>,
);
