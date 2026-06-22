import { create } from 'zustand';
import type { IDailyService } from '../../services/daily.ts';
import { IncomingCallStore, initialIncomingCallStore } from './state.ts';
import { IncomingCallActions, createIncomingCallActions } from './actions.ts';

export const createIncomingCallStore = (dailyService: IDailyService) => create<IncomingCallStore & IncomingCallActions>()((set, get) => ({
  ...initialIncomingCallStore,
  ...createIncomingCallActions(set, get, dailyService),
}));
