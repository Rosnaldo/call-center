import { createContext, useContext, type ReactNode } from 'react';
import { DailyProvider } from '@daily-co/daily-react';
import { DailyService } from '@/src/services/daily';

const DailyServiceContext = createContext<DailyService | null>(null);

interface DailyServiceProviderProps {
  dailyService: DailyService;
  children: ReactNode;
}

export function DailyServiceProvider({ dailyService, children }: DailyServiceProviderProps) {
  return (
    <DailyServiceContext.Provider value={dailyService}>
      <DailyProvider callObject={dailyService.callObject}>
        {children}
      </DailyProvider>
    </DailyServiceContext.Provider>
  );
}

export function useDailyService(): DailyService {
  const ctx = useContext(DailyServiceContext);
  if (!ctx) throw new Error('useDailyService must be used within DailyServiceProvider');
  return ctx;
}
