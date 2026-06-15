import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { useAuthStore } from './states/auth/store.ts';
import { initOnlineUsersWebSocket } from './services/online-users-ws.ts';

useAuthStore.getState().bootstrap();
initOnlineUsersWebSocket();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>,
)


