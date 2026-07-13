import { create } from 'zustand';
import type { StoresRef } from '../../stores.ts';
import { ChatStore, initialChatStore } from './state.ts';
import { ChatActions, createChatActions } from './actions.ts';

export const createChatStore = (ref: StoresRef) => create<ChatStore & ChatActions>()(
  (set) => ({
    ...initialChatStore,
    ...createChatActions(set, ref),
  })
);
