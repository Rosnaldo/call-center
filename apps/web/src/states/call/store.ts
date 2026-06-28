import { create } from 'zustand';
import type { IDailyService } from '../../services/daily.ts';
import type { StoresRef } from '../stores.ts';
import { CallStore, initialCallStore } from './state.ts';
import { CallActions, createCallActions } from './actions.ts';

export const createCallStore = (dailyService: IDailyService, ref: StoresRef) => create<CallStore & CallActions>()(
  (set, get) => ({
    ...initialCallStore,
    ...createCallActions(set, get, dailyService, ref),
  })
);
