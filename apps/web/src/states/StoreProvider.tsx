import { createContext, useContext, useState, type ReactNode } from 'react';
import { createStores, type Stores } from './stores.ts';

const StoreContext = createContext<Stores | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
    const [value] = useState(createStores);
    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStores(): Stores {
    const ctx = useContext(StoreContext);
    if (!ctx) throw new Error('useStores must be used within StoreProvider');
    return ctx;
}
