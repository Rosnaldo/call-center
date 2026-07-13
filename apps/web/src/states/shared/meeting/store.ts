import { create } from 'zustand';
import type { StoresRef } from '../../stores.ts';
import { MeetingStore, initialMeetingStore } from './state.ts';
import { MeetingActions, createMeetingActions } from './actions.ts';

export const createMeetingStore = (ref: StoresRef) => create<MeetingStore & MeetingActions>()(() => ({
  ...initialMeetingStore,
  ...createMeetingActions(ref),
}));
