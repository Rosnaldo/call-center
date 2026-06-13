import {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import App from './App.tsx';
// @ts-ignore: allow side-effect import for CSS without type declarations
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" id="global-suspense-spinner"></div>
              <p className="text-gray-500 font-medium text-sm animate-pulse">Carregando portal...</p>
            </div>
          </div>
        }>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
);

