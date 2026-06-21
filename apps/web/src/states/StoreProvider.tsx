import { createContext, useContext, type ReactNode } from 'react';
import type { Stores } from './stores.ts';

const StoreContext = createContext<Stores | null>(null);

export function StoreProvider({ stores, children }: { stores: Stores; children: ReactNode }) {
    return <StoreContext.Provider value={stores}>{children}</StoreContext.Provider>;
}

export function useStores(): Stores {
    const ctx = useContext(StoreContext);
    if (!ctx) throw new Error('useStores must be used within StoreProvider');
    return ctx;
}
